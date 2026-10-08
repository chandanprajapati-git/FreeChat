const Message = require("../models/message");

const sendMessage = async (req, res) => {
  try {
    console.log("SEND MESSAGE CONTROLLER HIT");
    const { receiverId, message, replyTo } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({
        message: "Receiver and message are required",
      });
    }

    const newMessage = await Message.create({
  sender: req.user,
  receiver: receiverId,
  message: message,
  replyTo: replyTo || null
});
const populatedMessage = await newMessage.populate(
  "replyTo",
  "message sender"
);

    const io = req.app.get("io");
    const onlineUsers = require("../socket/socketManager");
    const receiverSocketId = onlineUsers.get(receiverId);

    console.log("Receiver ID:", receiverId);
    console.log("Receiver Socket ID:", receiverSocketId);
    console.log("Online Users:", onlineUsers);
    if (receiverSocketId) {
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

const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Message is required",
      });
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

const receiverSocketId = onlineUsers.get(
  updatedMessage.receiver.toString()
);

if (receiverSocketId) {
  io.to(receiverSocketId).emit("messageEdited", {
    messageId: updatedMessage._id.toString(),
    message: updatedMessage.message,
  });
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

    await Message.findByIdAndDelete(messageId);

    const io = req.app.get("io");
const onlineUsers = require("../socket/socketManager");

const receiverSocketId = onlineUsers.get(message.receiver.toString());

if (receiverSocketId) {
  io.to(receiverSocketId).emit("messageDeleted", {
    messageId: message._id.toString(),
  });
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

module.exports = { sendMessage,deleteMessage,editMessage, getMessages };
