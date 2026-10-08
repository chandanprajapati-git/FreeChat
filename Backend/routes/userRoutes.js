const express=require("express");
const router=express.Router()

const {getUsers,getMyProfile,uploadProfileImage}= require("../controllers/usercontroller")
const protect=require("../middlewares/authMiddleware")
const upload=require("../middlewares/uploadMiddleware")

router.get("/",protect,getUsers);
router.get("/profile", protect, getMyProfile);
router.put(
  "/profile-image",
  protect,
  upload.single("profileImage"),
  uploadProfileImage
);

module.exports=router;
