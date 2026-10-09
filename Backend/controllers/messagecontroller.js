const Message = require("../models/message");
const User = require("../models/User");
const Group = require("../models/Group");

const maskGroupAuthors = (messages) => messages.map((message) => {
  const item = message.toObject ? message.toObject() : { ...message };
  if (item.sender?.isAnonymous) {
    item.sender = { ...item.sender, name: "Anonymous", profileImage: "", email: "" };
  }
  return item;
});

const sendMessage = async (req, res) => {
  try {
    console.log("SEND MESSAGE CONTROLLER HIT");
    const { receiverId, groupId, message, replyTo } = req.body;

    if ((!receiverId && !groupId) || (!message?.trim() && !req.file)) {
      return res.status(400).json({
        message: "Receiver and message are required",
      });
    }
    let group = null;
    if (groupId) {
      group = await Group.findOne({ _id: groupId, members: req.user }).select("members");
      if (!group) return res.status(403).json({ message: "Join this group before messaging." });
    } else {
      const areFriends = await User.exists({ _id: req.user, friends: receiverId });
      if (!areFriends) return res.status(403).json({ message: "Accept a friend request before messaging." });
    }

    const newMessage = await Message.create({
  sender: req.user,
  ...(groupId ? { group: groupId } : { receiver: receiverId }),
      message: message?.trim() || req.file.originalname,
      replyTo: replyTo || null,
      attachment: req.file ? {
        url: `/uploads/${req.file.filename}`,
        name: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      } : undefined,
    });
const populatedMessage = await newMessage.populate([
  { path: "replyTo", select: "message sender" },
  ...(groupId ? [{ path: "sender", select: "name profileImage isAnonymous" }] : []),
]);

    const io = req.app.get("io");
    const onlineUsers = require("../socket/socketManager");
    const receiverSocketId = receiverId ? onlineUsers.get(receiverId) : null;

    console.log("Receiver ID:", receiverId);
    console.log("Receiver Socket ID:", receiverSocketId);
    console.log("Online Users:", onlineUsers);
    if (groupId) {
      const groupPayload = populatedMessage.toObject();
      if (groupPayload.sender?.isAnonymous) {
        groupPayload.sender = { ...groupPayload.sender, name: "Anonymous", profileImage: "", email: "" };
      }
      io.to(`group:${groupId}`).emit("groupMessage", groupPayload);
    } else if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveMessage", populatedMessage);
    }
    res.status(201).json({
      message: "message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const areFriends = await User.exists({ _id: req.user, friends: userId });
    if (!areFriends) return res.status(403).json({ message: "Chat is available only between friends." });

    const messages = await Message.find({
  $or: [
    { sender: req.user, receiver: userId },
    { sender: userId, receiver: req.user },
  ],
})
  .populate("replyTo", "message sender")
  .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const isMember = await Group.exists({ _id: groupId, members: req.user });
    if (!isMember) return res.status(403).json({ message: "Join this group to view its messages." });
    const messages = await Message.find({ group: groupId })
      .populate("sender", "name profileImage email isAnonymous")
      .populate("replyTo", "message sender")
      .sort({ createdAt: 1 });
    res.json(maskGroupAuthors(messages));
  } catch (error) {
    res.status(500).json({ message: "Could not load group messages.", error: error.message });
  }
};

const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    const existingMessage = await Message.findOne({ _id: messageId, sender: req.user }).select("receiver group");
    const canEdit = existingMessage?.group
      ? await Group.exists({ _id: existingMessage.group, members: req.user })
      : existingMessage && await User.exists({ _id: req.user, friends: existingMessage.receiver });
    if (existingMessage && !canEdit) {
      return res.status(403).json({ message: "You must be friends to edit this message." });
    }

    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        sender: req.user,
      },
      {
        message: message.trim(),
      },
      {
        new: true,
      }
    );

    if (!updatedMessage) {
      return res.status(404).json({
        message: "Message not found or not authorized",
      });
    }

    const io = req.app.get("io");
const onlineUsers = require("../socket/socketManager");

const eventPayload = {
    messageId: updatedMessage._id.toString(),
    message: updatedMessage.message,
  };
if (updatedMessage.group) io.to(`group:${updatedMessage.group}`).emit("messageEdited", eventPayload);
else {
  const receiverSocketId = onlineUsers.get(updatedMessage.receiver.toString());
  if (receiverSocketId) io.to(receiverSocketId).emit("messageEdited", eventPayload);
}

    res.status(200).json({
      message: "Message updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      sender: req.user,
    });

    if (!message) {
      return res.status(404).json({
        message: "Message not found or not authorized",
      });
    }

    const canDelete = message.group
      ? await Group.exists({ _id: message.group, members: req.user })
      : await User.exists({ _id: req.user, friends: message.receiver });
    if (!canDelete) {
      return res.status(403).json({ message: "You must be friends to delete this message." });
    }

    await Message.findByIdAndDelete(messageId);

    const io = req.app.get("io");
const onlineUsers = require("../socket/socketManager");

const eventPayload = {
    messageId: message._id.toString(),
  };
if (message.group) io.to(`group:${message.group}`).emit("messageDeleted", eventPayload);
else {
  const receiverSocketId = onlineUsers.get(message.receiver.toString());
  if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", eventPayload);
}

    res.status(200).json({
      message: "Message deleted successfully",
      messageId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = { sendMessage,deleteMessage,editMessage, getMessages, getGroupMessages };
