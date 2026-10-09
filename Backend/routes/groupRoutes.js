const express = require("express");
const protect = require("../middlewares/authMiddleware");
const { listGroups, createGroup, joinGroup, groupDetails, addGroupMember, removeGroupMember, leaveGroup, clearGroupMessages } = require("../controllers/groupController");

const router = express.Router();
router.get("/", protect, listGroups);
router.post("/", protect, createGroup);
router.post("/:groupId/join", protect, joinGroup);
router.get("/:groupId", protect, groupDetails);
router.post("/:groupId/members", protect, addGroupMember);
router.delete("/:groupId/members/:userId", protect, removeGroupMember);
router.post("/:groupId/leave", protect, leaveGroup);
router.delete("/:groupId/messages", protect, clearGroupMessages);
module.exports = router;
