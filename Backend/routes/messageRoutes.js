const express=require("express");
const router=express.Router();
const {sendMessage,deleteMessage, editMessage,getMessages}= require("../controllers/messagecontroller")
const protect= require("../middlewares/authMiddleware")



router.post("/",protect,sendMessage);
router.get("/:userId",protect,getMessages)
router.delete("/:messageId", protect, deleteMessage);
router.put("/:messageId", protect, editMessage);

module.exports= router;