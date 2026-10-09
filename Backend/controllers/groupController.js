const mongoose = require("mongoose");
const Group = require("../models/Group");
const User = require("../models/User");
const onlineUsers = require("../socket/socketManager");

const describeMember = (member, requesterId, friendshipIds, creatorId) => {
  const id = String(member._id);
  const isFriend = id === String(requesterId) || friendshipIds.some((friendId) => String(friendId) === id);
  const anonymous = !isFriend || member.isAnonymous;
  return {
    _id: id,
    name: anonymous ? "Anonymous" : member.name,
    profileImage: anonymous ? "" : member.profileImage,
    isAnonymous: anonymous,
    isOnline: anonymous ? false : onlineUsers.has(id),
    isFriend,
    isAdmin: id === String(creatorId),
  };
};

const listGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user }).select("name creator members createdAt").sort({ updatedAt: -1 });
    res.json(groups);
  } catch {
    res.status(500).json({ message: "Could not load your groups." });
  }
};

const createGroup = async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name || name.length > 60) return res.status(400).json({ message: "Enter a group name up to 60 characters." });
  try {
    const group = await Group.create({ name, creator: req.user, members: [req.user] });
    res.status(201).json({ group });
  } catch {
    res.status(500).json({ message: "Could not create the group." });
  }
};

const joinGroup = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.groupId)) return res.status(400).json({ message: "This group QR code is invalid." });
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $addToSet: { members: req.user } },
      { new: true },
    ).select("name creator members createdAt");
    if (!group) return res.status(404).json({ message: "This group no longer exists." });
    res.json({ group });
  } catch {
    res.status(500).json({ message: "Could not join this group." });
  }
};

const groupDetails = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, members: req.user })
      .populate("members", "name profileImage isAnonymous");
    if (!group) return res.status(404).json({ message: "Group not found." });
    const self = await User.findById(req.user).select("friends");
    const members = group.members.map((member) => describeMember(member, req.user, self?.friends || [], group.creator));
    res.json({
      _id: group._id,
      name: group.name,
      creator: String(group.creator),
      members,
      memberCount: members.length,
      onlineCount: members.filter((member) => member.isOnline).length,
      isAdmin: String(group.creator) === String(req.user),
    });
  } catch {
    res.status(500).json({ message: "Could not load group details." });
  }
};

const addGroupMember = async (req, res) => {
  const userId = String(req.body.userId || "");
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "Choose a valid person." });
  try {
    const group = await Group.findOne({ _id: req.params.groupId, members: req.user });
    if (!group) return res.status(404).json({ message: "Group not found." });
    const isFriend = await User.exists({ _id: req.user, friends: userId });
    if (!isFriend) return res.status(403).json({ message: "You can add people you are friends with. Send a friend request first." });
    const targetExists = await User.exists({ _id: userId });
    if (!targetExists) return res.status(404).json({ message: "User not found." });
    await Group.updateOne({ _id: group._id }, { $addToSet: { members: userId } });
    const targetSocket = onlineUsers.get(userId);
    if (targetSocket) req.app.get("io").to(targetSocket).emit("groupAdded", { groupId: String(group._id) });
    res.json({ message: "Friend added to the group." });
  } catch {
    res.status(500).json({ message: "Could not add this person to the group." });
  }
};

const removeGroupMember = async (req, res) => {
  const memberId = String(req.params.userId || "");
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group || !group.members.some((id) => String(id) === String(req.user))) return res.status(404).json({ message: "Group not found." });
    if (String(group.creator) !== String(req.user)) return res.status(403).json({ message: "Only the group admin can remove members." });
    if (memberId === String(group.creator)) return res.status(400).json({ message: "The admin cannot remove themselves. Transfer admin first or leave the group." });
    const result = await Group.updateOne({ _id: group._id }, { $pull: { members: memberId } });
    if (!result.modifiedCount) return res.status(404).json({ message: "Member not found." });
    const targetSocket = onlineUsers.get(memberId);
    if (targetSocket) {
      const io = req.app.get("io");
      io.in(targetSocket).socketsLeave(`group:${group._id}`);
      io.to(targetSocket).emit("groupRemoved", { groupId: String(group._id) });
    }
    res.json({ message: "Member removed from the group." });
  } catch {
    res.status(500).json({ message: "Could not remove this member." });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, members: req.user });
    if (!group) return res.status(404).json({ message: "Group not found." });
    const remaining = group.members.filter((id) => String(id) !== String(req.user));
    if (!remaining.length) await Group.deleteOne({ _id: group._id });
    else {
      const update = { $pull: { members: req.user } };
      if (String(group.creator) === String(req.user)) update.$set = { creator: remaining[0] };
      await Group.updateOne({ _id: group._id }, update);
    }
    const io = req.app.get("io");
    const socketId = onlineUsers.get(String(req.user));
    if (socketId) io.in(socketId).socketsLeave(`group:${group._id}`);
    io.to(`group:${group._id}`).emit("groupMemberLeft", { groupId: String(group._id), userId: String(req.user) });
    res.json({ message: "You left the group." });
  } catch {
    res.status(500).json({ message: "Could not leave the group." });
  }
};

const clearGroupMessages = async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, members: req.user }).select("_id");
    if (!group) return res.status(404).json({ message: "Group not found." });
    const clearedAt = new Date();
    await Group.updateOne({ _id: group._id }, { $set: { [`clearedAtByUser.${req.user}`]: clearedAt } });
    const socketId = onlineUsers.get(String(req.user));
    if (socketId) req.app.get("io").to(socketId).emit("groupCleared", { groupId: String(req.params.groupId), userId: String(req.user) });
    res.json({ message: "Your group chat history was cleared.", clearedAt });
  } catch {
    res.status(500).json({ message: "Could not clear this group chat." });
  }
};

module.exports = { listGroups, createGroup, joinGroup, groupDetails, addGroupMember, removeGroupMember, leaveGroup, clearGroupMessages };
