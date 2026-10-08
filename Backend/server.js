const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const connectDb = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const onlineUsers = require("./socket/socketManager");
const Message = require("./models/message");
const User = require("./models/User");
const registerCallSignaling = require("./socket/callSignaling");
const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);


const PORT = process.env.PORT || 5000;

// Render and Vercel use different origins. Keep localhost for development,
// allow Vercel deployments, and let production deployments list their exact
// frontend origins in FRONTEND_ORIGINS (comma-separated).
const allowedOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    let hostname = "";
    try {
      hostname = new URL(origin).hostname;
    } catch {
      return callback(new Error("Invalid request origin"));
    }
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    const isVercel = hostname === "vercel.app" || hostname.endsWith(".vercel.app");
    callback(null, isLocal || isVercel || allowedOrigins.includes(origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

connectDb();

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("Backend is Running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.authenticatedUserId = String(decoded.userId);
    next();
  } catch {
    next(new Error("Invalid socket token"));
  }
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  registerCallSignaling(socket, io, onlineUsers);

  socket.on("register", async (userId) => {
    try {
      const authenticatedUserId = socket.authenticatedUserId;
      if (!authenticatedUserId || String(userId) !== authenticatedUserId) return;
      console.log("User registered:", authenticatedUserId);

      socket.userId = authenticatedUserId;

      onlineUsers.set(authenticatedUserId, socket.id);

      await User.findByIdAndUpdate(authenticatedUserId, {
        isOnline: true,
      });

      console.log("User is online");
    } catch (error) {
      console.log("Online status error:", error.message);
    }
  });
  socket.on("messageDelivered", async (data) => {
    try {
      console.log("MESSAGE DELIVERED EVENT RECEIVED");
      console.log("Message ID:", data.messageId);

      const updatedMessage = await Message.findByIdAndUpdate(
        data.messageId,
        { status: "delivered" },
        { returnDocument: "after" },
      );

      if (updatedMessage) {
        console.log("Message status updated:", updatedMessage.status);

        const senderSocketId = onlineUsers.get(
          updatedMessage.sender.toString(),
        );

        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdated", {
            messageId: updatedMessage._id.toString(),
            status: updatedMessage.status,
          });
        }
      }
    } catch (error) {
      console.log("Delivery status error:", error.message);
    }
  });

  socket.on("messageRead", async (data) => {
    try {
      console.log("MESSAGE READ EVENT RECEIVED");
      console.log("Message ID:", data.messageId);

      const updatedMessage = await Message.findByIdAndUpdate(
        data.messageId,
        { status: "read" },
        { returnDocument: "after" },
      );

      if (updatedMessage) {
        console.log("Message status updated:", updatedMessage.status);

        const senderSocketId = onlineUsers.get(
          updatedMessage.sender.toString(),
        );

        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdated", {
            messageId: updatedMessage._id.toString(),
            status: updatedMessage.status,
          });
        }
      }
    } catch (error) {
      console.log("Read status error:", error.message);
    }
  });

  socket.on("disconnect", async () => {
    try {
      console.log("User disconnected:", socket.id);

      if (socket.userId) {
        onlineUsers.delete(socket.userId);

        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        console.log("User is offline");
      }
    } catch (error) {
      console.log("Offline status error:", error.message);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
