const mongoose = require("mongoose");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const onlineUsers = require("../socket/socketManager");

const userSummary = "name profileImage isAnonymous isOnline lastSeen";

const privacySafeUser = (value) => {
  if (!value) return value;
  const user = value.toObject ? value.toObject() : { ...value };
  if (!user.isAnonymous) return user;
  return { ...user, name: "Anonymous", email: "", profileImage: "", isOnline: false, lastSeen: null };
};

const searchByPhone = async (req, res) => {
  try {
    const q = String(req.query.phone || "").trim();
    if (q.length < 3) {
      return res.status(400).json({ message: "Enter at least 3 characters to search." });
    }
    
    const isPhone = /^[+\d\s().-]+$/.test(q);
    const phoneDigits = q.replace(/\D/g, "");

    let query;
    if (isPhone && phoneDigits.length >= 7) {
       query = { phone: phoneDigits, _id: { $ne: req.user } };
    } else {
       const escapedName = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
       query = { name: { $regex: new RegExp(escapedName, "i") }, _id: { $ne: req.user } };
    }

    const users = await User.find(query).select(userSummary).limit(10);
    if (users.length === 0) return res.status(404).json({ message: "No accounts found matching that search." });

    const self = await User.findById(req.user).select("friends");
    
    const results = await Promise.all(users.map(async (user) => {
        let relationship = self?.friends?.some((id) => String(id) === String(user._id)) ? "friends" : "none";
        let requestId = null;
        if (relationship === "none") {
          const [outgoing, incoming] = await Promise.all([
            FriendRequest.findOne({ sender: req.user, recipient: user._id, status: "pending" }).select("_id"),
            FriendRequest.findOne({ sender: user._id, recipient: req.user, status: "pending" }).select("_id"),
          ]);
          if (outgoing) relationship = "outgoing";
          else if (incoming) { relationship = "incoming"; requestId = incoming._id; }
        }
        return { user: privacySafeUser(user), relationship, requestId };
    }));
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: "Could not search for that person." });
  }
};

const getRequests = async (req, res) => {
  try {
    const [incoming, outgoing] = await Promise.all([
      FriendRequest.find({ recipient: req.user, status: "pending" }).populate("sender", userSummary).sort({ createdAt: -1 }),
      FriendRequest.find({ sender: req.user, status: "pending" }).populate("recipient", userSummary).sort({ createdAt: -1 }),
    ]);
    res.json({
      incoming: incoming.map((request) => ({ ...request.toObject(), sender: privacySafeUser(request.sender) })),
      outgoing: outgoing.map((request) => ({ ...request.toObject(), recipient: privacySafeUser(request.recipient) })),
    });
  } catch (error) {
    res.status(500).json({ message: "Could not load friend requests." });
  }
};

const sendRequest = async (req, res) => {
  try {
    const recipientId = String(req.body.userId || "");
    if (!mongoose.isValidObjectId(recipientId) || recipientId === String(req.user)) {
      return res.status(400).json({ message: "Choose a valid person." });
    }
    const recipient = await User.findById(recipientId).select("name profileImage isAnonymous isOnline lastSeen friends");
    const sender = await User.findById(req.user).select("name profileImage isAnonymous");
    if (!recipient || !sender) return res.status(404).json({ message: "User not found." });
    if (recipient.friends.some((id) => String(id) === String(req.user))) {
      return res.status(409).json({ message: "You are already friends." });
    }
    const existing = await FriendRequest.findOne({
      status: "pending",
      $or: [
        { sender: req.user, recipient: recipientId },
        { sender: recipientId, recipient: req.user },
      ],
    });
    if (existing) return res.status(409).json({ message: "A friend request is already pending." });

    const request = await FriendRequest.create({ sender: req.user, recipient: recipientId });
    const recipientSocket = onlineUsers.get(recipientId);
    if (recipientSocket) {
      req.app.get("io").to(recipientSocket).emit("friendRequestReceived", {
        requestId: request._id,
        sender: privacySafeUser(sender),
      });
    }
    res.status(201).json({ message: "Friend request sent." });
  } catch (error) {
    res.status(500).json({ message: "Could not send friend request." });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findOneAndUpdate(
      { _id: req.params.requestId, recipient: req.user, status: "pending" },
      { status: "accepted" },
      { new: true },
    ).populate("recipient", userSummary);
    if (!request) return res.status(404).json({ message: "This request is no longer pending." });

    await Promise.all([
      User.updateOne({ _id: req.user }, { $addToSet: { friends: request.sender } }),
      User.updateOne({ _id: request.sender }, { $addToSet: { friends: req.user } }),
    ]);
    const senderSocket = onlineUsers.get(String(request.sender));
    if (senderSocket) {
      req.app.get("io").to(senderSocket).emit("friendRequestUpdated", { status: "accepted" });
    }
    res.json({ message: "Friend request accepted.", friend: privacySafeUser(request.recipient) });
  } catch (error) {
    res.status(500).json({ message: "Could not accept this request." });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findOneAndUpdate(
      { _id: req.params.requestId, recipient: req.user, status: "pending" },
      { status: "rejected" },
      { new: true },
    );
    if (!request) return res.status(404).json({ message: "This request is no longer pending." });
    const senderSocket = onlineUsers.get(String(request.sender));
    if (senderSocket) req.app.get("io").to(senderSocket).emit("friendRequestUpdated", { status: "rejected" });
    res.json({ message: "Friend request declined." });
  } catch (error) {
    res.status(500).json({ message: "Could not decline this request." });
  }
};

const unfriend = async (req, res) => {
  try {
    const friendId = String(req.params.userId);
    if (!mongoose.isValidObjectId(friendId)) return res.status(400).json({ message: "Choose a valid friend." });
    const [removeCurrent, removeFriend] = await Promise.all([
      User.updateOne({ _id: req.user }, { $pull: { friends: friendId } }),
      User.updateOne({ _id: friendId }, { $pull: { friends: req.user } }),
    ]);
    if (!removeCurrent.matchedCount || !removeFriend.matchedCount) return res.status(404).json({ message: "Friend not found." });
    await FriendRequest.updateMany({
      status: "accepted",
      $or: [
        { sender: req.user, recipient: friendId },
        { sender: friendId, recipient: req.user },
      ],
    }, { status: "removed" });
    const friendSocket = onlineUsers.get(friendId);
    if (friendSocket) req.app.get("io").to(friendSocket).emit("friendshipRemoved", { userId: String(req.user) });
    res.json({ message: "Friend removed." });
  } catch (error) {
    res.status(500).json({ message: "Could not remove this friend." });
  }
};

module.exports = { searchByPhone, getRequests, sendRequest, acceptRequest, rejectRequest, unfriend };
