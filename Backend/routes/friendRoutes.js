const express = require("express");
const protect = require("../middlewares/authMiddleware");
const {
  searchByPhone, getRequests, sendRequest, acceptRequest, rejectRequest, unfriend,
} = require("../controllers/friendController");

const router = express.Router();
router.use(protect);
router.get("/search", searchByPhone);
router.get("/requests", getRequests);
router.post("/requests", sendRequest);
router.post("/requests/:requestId/accept", acceptRequest);
router.post("/requests/:requestId/reject", rejectRequest);
router.delete("/:userId", unfriend);

module.exports = router;
