const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, default: "", trim: true, maxlength: 500 },
  icon: { type: String, default: "" },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  memberRoles: { type: Map, of: { type: String, trim: true, maxlength: 20 }, default: {} },
  clearedAtByUser: { type: Map, of: Date, default: {} },
}, { timestamps: true });

module.exports = mongoose.model("Group", groupSchema);
