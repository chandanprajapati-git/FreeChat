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
};

const registerCallSignaling = (socket, io, onlineUsers) => {
  const activeCalls = registerCallSignaling.activeCalls || (registerCallSignaling.activeCalls = new Map());

  const relayToPeer = (data, responseEvent, { start = false, finish = false } = {}) => {
    const toUserId = String(data?.toUserId || "");
    const callId = String(data?.callId || "");
    if (!socket.userId || !toUserId || !callId || toUserId === String(socket.userId)) {
      return;
    }

    const fromUserId = String(socket.userId);
    if (start) {
      if (activeCalls.has(callId)) return;
    } else {
      const call = activeCalls.get(callId);
      if (!call || ![call.callerId, call.calleeId].includes(fromUserId)) return;
      const expectedPeerId = call.callerId === fromUserId ? call.calleeId : call.callerId;
      if (expectedPeerId !== toUserId) return;
    }

    const peerSocketId = onlineUsers.get(toUserId);
    if (!peerSocketId) {
      socket.emit(CALL_EVENTS.unavailable, { callId, reason: "offline" });
      return;
    }

    if (start) activeCalls.set(callId, { callerId: fromUserId, calleeId: toUserId });

    io.to(peerSocketId).emit(responseEvent, {
      ...data,
      callId,
      fromUserId,
    });
    if (finish) activeCalls.delete(callId);
  };

  socket.on(CALL_EVENTS.offer, (data = {}) => {
    if (data.callType !== "audio" && data.callType !== "video") return;
    if (!data.offer || typeof data.offer !== "object") return;
    relayToPeer(data, CALL_EVENTS.incoming, { start: true });
  });

  socket.on(CALL_EVENTS.answer, (data = {}) => {
    if (!data.answer || typeof data.answer !== "object") return;
    relayToPeer(data, CALL_EVENTS.answered);
  });

  socket.on(CALL_EVENTS.candidate, (data = {}) => {
    if (!data.candidate || typeof data.candidate !== "object") return;
    relayToPeer(data, CALL_EVENTS.candidate);
  });

  socket.on(CALL_EVENTS.reject, (data = {}) => {
    relayToPeer(data, CALL_EVENTS.rejected, { finish: true });
  });

  socket.on(CALL_EVENTS.end, (data = {}) => {
    relayToPeer(data, CALL_EVENTS.ended, { finish: true });
  });

  socket.on("disconnect", () => {
    for (const [callId, call] of activeCalls) {
      if (call.callerId !== String(socket.userId) && call.calleeId !== String(socket.userId)) continue;
      const peerId = call.callerId === String(socket.userId) ? call.calleeId : call.callerId;
      const peerSocketId = onlineUsers.get(peerId);
      if (peerSocketId) io.to(peerSocketId).emit(CALL_EVENTS.ended, { callId });
      activeCalls.delete(callId);
    }
  });
};

module.exports = registerCallSignaling;
