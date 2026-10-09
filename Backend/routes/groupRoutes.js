const express = require("express");
const protect = require("../middlewares/authMiddleware");
const { listGroups, createGroup, joinGroup } = require("../controllers/groupController");

const router = express.Router();
router.get("/", protect, listGroups);
router.post("/", protect, createGroup);
router.post("/:groupId/join", protect, joinGroup);
module.exports = router;
