const express = require("express");
const protect = require("../middlewares/authMiddleware");
const { listGroups, createGroup, joinGroup, groupDetails, updateGroup, addGroupMember, updateGroupMemberRole, removeGroupMember, leaveGroup, clearGroupMessages } = require("../controllers/groupController");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();
const receiveGroupIcon = (req, res, next) => {
  upload.single("groupIcon")(req, res, (error) => {
    if (!error) return next();
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      message: tooLarge ? "Group icons must be 5 MB or smaller." : error.message,
    });
  });
};
router.get("/", protect, listGroups);
router.post("/", protect, createGroup);
router.post("/:groupId/join", protect, joinGroup);
router.get("/:groupId", protect, groupDetails);
router.put("/:groupId", protect, receiveGroupIcon, updateGroup);
router.post("/:groupId/members", protect, addGroupMember);
router.put("/:groupId/members/:userId/role", protect, updateGroupMemberRole);
router.delete("/:groupId/members/:userId", protect, removeGroupMember);
router.post("/:groupId/leave", protect, leaveGroup);
router.delete("/:groupId/messages", protect, clearGroupMessages);
module.exports = router;
