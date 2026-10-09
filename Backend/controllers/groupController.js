const mongoose = require("mongoose");
const Group = require("../models/Group");
const User = require("../models/User");
const onlineUsers = require("../socket/socketManager");

const normalizeMemberRole = (role) => ({ Admin: "Co-leader", Moderator: "Elder", VIP: "Elder" }[role] || (["Member", "Elder", "Co-leader"].includes(role) ? role : "Member"));
const isGroupAdmin = (group, userId) => String(group.creator) === String(userId) || ["Co-leader", "Admin"].includes(group.memberRoles?.get(String(userId)));

const describeMember = (member, requesterId, friendshipIds, creatorId, memberRoles = new Map()) => {
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
    isAdmin: id === String(creatorId) || ["Co-leader", "Admin"].includes(memberRoles.get(id)),
    role: id === String(creatorId) ? "Leader" : normalizeMemberRole(memberRoles.get(id)),
  };
};

const listGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user }).select("name description icon creator members createdAt").sort({ updatedAt: -1 });
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
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "This group no longer exists." });
    if (!group.members.some((memberId) => String(memberId) === String(req.user))) {
      group.members.push(req.user);
      group.memberRoles.set(String(req.user), "Member");
      await group.save();
    }
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
    const members = group.members.map((member) => describeMember(member, req.user, self?.friends || [], group.creator, group.memberRoles));
    res.json({
      _id: group._id,
      name: group.name,
      description: group.description || "",
      icon: group.icon || "",
      creator: String(group.creator),
      members,
      memberCount: members.length,
      onlineCount: members.filter((member) => member.isOnline).length,
      isAdmin: isGroupAdmin(group, req.user),
    });
  } catch {
    res.status(500).json({ message: "Could not load group details." });
  }
};

const updateGroup = async (req, res) => {
  const name = req.body.name === undefined ? undefined : String(req.body.name || "").trim();
  const description = req.body.description === undefined ? undefined : String(req.body.description || "").trim();
  if (name !== undefined && (!name || name.length > 60)) return res.status(400).json({ message: "Enter a group name up to 60 characters." });
  if (description !== undefined && description.length > 500) return res.status(400).json({ message: "Group description must be 500 characters or fewer." });
  try {
    const group = await Group.findOne({ _id: req.params.groupId, members: req.user });
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!isGroupAdmin(group, req.user)) return res.status(403).json({ message: "Only a group admin can change its name or icon." });
    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (req.file) group.icon = `/uploads/${req.file.filename}`;
    await group.save();
    const payload = { _id: String(group._id), name: group.name, description: group.description || "", icon: group.icon || "", creator: String(group.creator), members: group.members };
    req.app.get("io").to(`group:${group._id}`).emit("groupUpdated", payload);
    res.json({ message: "Group updated.", group: payload });
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not update this group." });
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
    if (!group.members.some((memberId) => String(memberId) === userId)) {
      group.members.push(userId);
      group.memberRoles.set(userId, "Member");
      await group.save();
    }
    const targetSocket = onlineUsers.get(userId);
    if (targetSocket) req.app.get("io").to(targetSocket).emit("groupAdded", { groupId: String(group._id) });
    res.json({ message: "Friend added to the group." });
  } catch {
    res.status(500).json({ message: "Could not add this person to the group." });
  }
};

const updateGroupMemberRole = async (req, res) => {
  const memberId = String(req.params.userId || "");
  const role = String(req.body.role || "");
  if (!["Leader", "Co-leader", "Elder", "Member"].includes(role)) return res.status(400).json({ message: "Choose a valid group role." });
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group || !group.members.some((id) => String(id) === String(req.user))) return res.status(404).json({ message: "Group not found." });
    if (!isGroupAdmin(group, req.user)) return res.status(403).json({ message: "Only a group admin can assign roles." });
    if (!group.members.some((id) => String(id) === memberId)) return res.status(404).json({ message: "Group member not found." });
    const currentRole = memberId === String(group.creator) ? "Leader" : normalizeMemberRole(group.memberRoles.get(memberId));
    if (currentRole === role) return res.json({ message: "Member role is already set.", groupId: String(group._id), userId: memberId, role });
    if (role === "Leader") {
      if (String(group.creator) !== String(req.user)) return res.status(403).json({ message: "Only the current Leader can transfer the Leader role." });
      if (memberId === String(group.creator)) return res.status(400).json({ message: "That member is already the Leader." });
      const result = await Group.updateOne(
        { _id: group._id, creator: req.user, members: memberId },
        { $set: { creator: memberId, [`memberRoles.${String(group.creator)}`]: "Member" }, $unset: { [`memberRoles.${memberId}`]: 1 } },
      );
      if (!result.modifiedCount) return res.status(409).json({ message: "The Leader changed before this update. Refresh the group and try again." });
    } else if (role === "Co-leader" && currentRole !== "Co-leader") {
      const result = await Group.updateOne({
        _id: group._id,
        members: memberId,
        $expr: {
          $lt: [
            { $size: { $filter: {
              input: { $objectToArray: { $ifNull: ["$memberRoles", {}] } },
              as: "memberRole",
              cond: { $in: ["$$memberRole.v", ["Co-leader", "Admin"]] },
            } } },
            7,
          ],
        },
      }, { $set: { [`memberRoles.${memberId}`]: role } });
      if (!result.modifiedCount) return res.status(409).json({ message: "A group can have at most 7 Co-leaders." });
    } else {
      group.memberRoles.set(memberId, role);
      await group.save();
    }
    const payload = { groupId: String(group._id), userId: memberId, role };
    req.app.get("io").to(`group:${group._id}`).emit("groupRoleUpdated", payload);
    res.json({ message: "Member role updated.", ...payload });
  } catch {
    res.status(500).json({ message: "Could not update this member's role." });
  }
};

const removeGroupMember = async (req, res) => {
  const memberId = String(req.params.userId || "");
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group || !group.members.some((id) => String(id) === String(req.user))) return res.status(404).json({ message: "Group not found." });
    if (!isGroupAdmin(group, req.user)) return res.status(403).json({ message: "Only a group admin can remove members." });
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
      update.$unset = { [`memberRoles.${String(req.user)}`]: 1 };
      if (String(group.creator) === String(req.user)) {
        update.$set = { creator: remaining[0] };
        update.$unset[`memberRoles.${String(remaining[0])}`] = 1;
      }
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

module.exports = { listGroups, createGroup, joinGroup, groupDetails, updateGroup, addGroupMember, updateGroupMemberRole, removeGroupMember, leaveGroup, clearGroupMessages };
