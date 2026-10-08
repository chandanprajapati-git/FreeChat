const mongoose = require("mongoose");

const friendRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", "removed"], default: "pending" },
}, { timestamps: true });

friendRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("FriendRequest", friendRequestSchema);
