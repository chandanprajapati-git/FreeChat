const express=require("express");
const router=express.Router();
const {sendMessage,deleteMessage, editMessage,getMessages}= require("../controllers/messagecontroller")
const protect= require("../middlewares/authMiddleware")
const upload = require("../middlewares/messageUploadMiddleware");

const receiveMessageFile = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        message: error.code === "LIMIT_FILE_SIZE"
          ? "Files must be 50 MB or smaller."
          : error.message,
      });
    }
    next();
  });
};



router.post("/",protect,receiveMessageFile,sendMessage);
router.get("/:userId",protect,getMessages)
router.delete("/:messageId", protect, deleteMessage);
router.put("/:messageId", protect, editMessage);

module.exports= router;
