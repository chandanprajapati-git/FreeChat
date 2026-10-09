const mongoose = require("mongoose");
const Group = require("../models/Group");

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

module.exports = { listGroups, createGroup, joinGroup };
