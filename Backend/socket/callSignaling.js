const User = require("../models/User");
const Message = require("../models/message");

const CALL_EVENTS = {
  offer: "call:offer",
  incoming: "call:incoming",
  answer: "call:answer",
  answered: "call:answered",
  candidate: "call:ice-candidate",
  reject: "call:reject",
  rejected: "call:rejected",
  end: "call:end",
  ended: "call:ended",
  unavailable: "call:unavailable",
  addParticipant: "call:add-participant",
  join: "call:join",
  participantJoined: "call:participant-joined",
};

const activeCalls = new Map();
const pendingIceByCall = new Map();

const pairKey = (a, b) => [String(a), String(b)].sort().join(":");
const persistCallRecord = async (call, userA, userB, status, durationSeconds = 0, io, onlineUsers) => {
  if (!userA || !userB || String(userA) === String(userB)) return;
  const key = pairKey(userA, userB);
  if (call.loggedPairs.has(key)) return;
  call.loggedPairs.add(key);
  try {
    const senderId = [String(userA), String(userB)].includes(String(call.initiatorId))
      ? String(call.initiatorId)
      : String(userA);
    const receiverId = senderId === String(userA) ? userB : userA;
    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message: "Call",
      kind: "call",
      call: { type: call.callType, status, durationSeconds: Math.max(0, Math.floor(durationSeconds)) },
    });
    for (const userId of [String(userA), String(userB)]) {
      const socketId = onlineUsers.get(userId);
      if (socketId) io.to(socketId).emit("receiveMessage", message);
    }
  } catch (error) {
    console.error("Could not save call history", error.message);
  }
};

const recordCallExit = (call, leavingUserId, otherUserIds, status, now, io, onlineUsers) => {
  for (const peerId of otherUserIds) {
    const connectedAt = Math.max(
      call.joinedAt.get(String(leavingUserId))?.getTime() || call.startedAt.getTime(),
      call.joinedAt.get(String(peerId))?.getTime() || call.startedAt.getTime(),
    );
    const pairStatus = status || (call.answeredPairs.has(pairKey(leavingUserId, peerId)) ? "completed" : "unanswered");
    void persistCallRecord(call, leavingUserId, peerId, pairStatus, (now.getTime() - connectedAt) / 1000, io, onlineUsers);
  }
};

const registerCallSignaling = (socket, io, onlineUsers) => {
  const relayToPeer = async (data, responseEvent, { start = false } = {}) => {
    const toUserId = String(data?.toUserId || "");
    const callId = String(data?.callId || "");
    const fromUserId = String(socket.userId || "");
    if (!fromUserId || !toUserId || !callId || toUserId === fromUserId) return;

    let call = activeCalls.get(callId);
    if (!call && responseEvent === CALL_EVENTS.candidate) {
      try {
        const areFriends = await User.exists({ _id: fromUserId, friends: toUserId });
        if (!areFriends) return;
      } catch {
        return;
      }
      call = activeCalls.get(callId);
      if (!call) {
        const pending = pendingIceByCall.get(callId) || [];
        if (pending.length < 64) {
          pending.push({ fromUserId, toUserId, candidate: data.candidate, expiresAt: Date.now() + 20000 });
          pendingIceByCall.set(callId, pending);
          setTimeout(() => {
            const current = pendingIceByCall.get(callId);
            if (!current) return;
            const fresh = current.filter((item) => item.expiresAt > Date.now());
            if (fresh.length) pendingIceByCall.set(callId, fresh);
            else pendingIceByCall.delete(callId);
          }, 20000).unref?.();
        }
        return;
      }
    }
    if (start && !call) {
      try {
        const areFriends = await User.exists({ _id: fromUserId, friends: toUserId });
        if (!areFriends) {
          socket.emit(CALL_EVENTS.unavailable, { callId, reason: "not-friends" });
          return;
        }
      } catch {
        socket.emit(CALL_EVENTS.unavailable, { callId, reason: "server-error" });
        return;
      }
      call = { callType: data.callType, initiatorId: fromUserId, members: new Set([fromUserId, toUserId]), pendingInvites: new Set(), startedAt: new Date(), joinedAt: new Map([[fromUserId, new Date()], [toUserId, new Date()]]), answeredPairs: new Set(), loggedPairs: new Set() };
      activeCalls.set(callId, call);
    } else if (!call || !call.members.has(fromUserId) || !call.members.has(toUserId)) {
      return;
    }

    const peerSocketId = onlineUsers.get(toUserId);
    if (!peerSocketId) {
      socket.emit(CALL_EVENTS.unavailable, { callId, reason: "offline" });
      if (start) recordCallExit(call, fromUserId, [toUserId], "missed", new Date(), io, onlineUsers);
      if (start && call.members.size === 2) activeCalls.delete(callId);
      return;
    }

    io.to(peerSocketId).emit(responseEvent, { ...data, callId, fromUserId });
    if (start) {
      const pending = pendingIceByCall.get(callId) || [];
      pendingIceByCall.delete(callId);
      for (const item of pending) {
        if (item.toUserId !== toUserId || item.expiresAt <= Date.now()) continue;
        io.to(peerSocketId).emit(CALL_EVENTS.candidate, {
          callId,
          fromUserId: item.fromUserId,
          candidate: item.candidate,
        });
      }
    }
  };

  socket.on(CALL_EVENTS.offer, (data = {}) => {
    if ((data.callType !== "audio" && data.callType !== "video") || !data.offer || typeof data.offer !== "object") return;
    void relayToPeer(data, CALL_EVENTS.incoming, { start: true });
  });

  socket.on(CALL_EVENTS.answer, (data = {}) => {
    if (!data.answer || typeof data.answer !== "object") return;
    const call = activeCalls.get(String(data.callId || ""));
    if (call) call.answeredPairs.add(pairKey(socket.userId, data.toUserId));
    void relayToPeer(data, CALL_EVENTS.answered);
  });

  socket.on(CALL_EVENTS.candidate, (data = {}) => {
    if (!data.candidate || typeof data.candidate !== "object") return;
    void relayToPeer(data, CALL_EVENTS.candidate);
  });

  socket.on(CALL_EVENTS.addParticipant, async (data = {}) => {
    const callId = String(data.callId || "");
    const toUserId = String(data.toUserId || "");
    const fromUserId = String(socket.userId || "");
    const call = activeCalls.get(callId);
    if (!call || !call.members.has(fromUserId) || !toUserId || call.members.has(toUserId)) return;
    if (call.pendingInvites.has(toUserId)) return;
    if (call.members.size + call.pendingInvites.size >= 4) {
      socket.emit(CALL_EVENTS.unavailable, { callId, reason: "full" });
      return;
    }
    try {
      const areFriends = await User.exists({ _id: fromUserId, friends: toUserId });
      if (!areFriends) return;
    } catch {
      return;
    }
    const targetSocket = onlineUsers.get(toUserId);
    if (!targetSocket) {
      socket.emit(CALL_EVENTS.unavailable, { callId, reason: "offline" });
      return;
    }
    call.pendingInvites.add(toUserId);
    io.to(targetSocket).emit(CALL_EVENTS.incoming, {
      callId,
      fromUserId,
      callType: call.callType,
      groupInvite: true,
      participants: [...call.members],
    });
  });

  socket.on(CALL_EVENTS.join, async (data = {}) => {
    const callId = String(data.callId || "");
    const inviterId = String(data.toUserId || "");
    const joiningUserId = String(socket.userId || "");
    const call = activeCalls.get(callId);
    if (!call || !call.members.has(inviterId) || call.members.has(joiningUserId) || !call.pendingInvites.has(joiningUserId) || call.members.size >= 4) {
      socket.emit(CALL_EVENTS.unavailable, { callId, reason: "ended" });
      return;
    }
    try {
      const areFriends = await User.exists({ _id: inviterId, friends: joiningUserId });
      if (!areFriends) {
        socket.emit(CALL_EVENTS.unavailable, { callId, reason: "not-friends" });
        return;
      }
    } catch {
      socket.emit(CALL_EVENTS.unavailable, { callId, reason: "server-error" });
      return;
    }
    call.members.add(joiningUserId);
    call.joinedAt.set(joiningUserId, new Date());
    call.pendingInvites.delete(joiningUserId);
    const payload = { callId, joinedUserId: joiningUserId, participants: [...call.members] };
    for (const participantId of call.members) {
      const participantSocket = onlineUsers.get(participantId);
      if (participantSocket) io.to(participantSocket).emit(CALL_EVENTS.participantJoined, payload);
    }
  });

  socket.on(CALL_EVENTS.reject, (data = {}) => {
    const callId = String(data.callId || "");
    const toUserId = String(data.toUserId || "");
    const fromUserId = String(socket.userId || "");
    const call = activeCalls.get(callId);
    if (!call || !toUserId) return;
    const wasPending = call.pendingInvites.delete(fromUserId);
    if (wasPending || (call.members.has(fromUserId) && call.members.has(toUserId))) {
      void persistCallRecord(call, toUserId, fromUserId, "declined", 0, io, onlineUsers);
    }
    if (call.members.has(fromUserId) && call.members.has(toUserId)) {
      call.members.delete(fromUserId);
      if (call.members.size <= 1) activeCalls.delete(callId);
    }
    const targetSocket = onlineUsers.get(toUserId);
    if (targetSocket) io.to(targetSocket).emit(CALL_EVENTS.rejected, { callId, fromUserId });
  });

  socket.on(CALL_EVENTS.end, (data = {}) => {
    const callId = String(data.callId || "");
    const fromUserId = String(socket.userId || "");
    const call = activeCalls.get(callId);
    if (!call) return;
    if (call.pendingInvites.has(fromUserId)) {
      call.pendingInvites.delete(fromUserId);
      const inviterId = String(data.toUserId || call.initiatorId);
      void persistCallRecord(call, inviterId, fromUserId, "missed", 0, io, onlineUsers);
      return;
    }
    if (!call.members.has(fromUserId)) return;
    const peers = [...call.members].filter((id) => id !== fromUserId);
    recordCallExit(call, fromUserId, peers, null, new Date(), io, onlineUsers);
    call.members.delete(fromUserId);
    for (const participantId of call.members) {
      const participantSocket = onlineUsers.get(participantId);
      if (participantSocket) io.to(participantSocket).emit(CALL_EVENTS.ended, { callId, fromUserId });
    }
    if (call.members.size <= 1) activeCalls.delete(callId);
  });

  socket.on("disconnect", () => {
    const fromUserId = String(socket.userId || "");
    for (const [callId, call] of activeCalls) {
      if (!call.members.delete(fromUserId)) continue;
      recordCallExit(call, fromUserId, [...call.members], null, new Date(), io, onlineUsers);
      for (const participantId of call.members) {
        const participantSocket = onlineUsers.get(participantId);
        if (participantSocket) io.to(participantSocket).emit(CALL_EVENTS.ended, { callId, fromUserId });
      }
      if (call.members.size <= 1) activeCalls.delete(callId);
    }
  });
};

module.exports = registerCallSignaling;
