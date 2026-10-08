const express = require('express')
const {registerUser,loginUser}= require("../controllers/authcontroller")
const router= express.Router()
const protect=require("../middlewares/authMiddleware")

router.post('/register',registerUser);
router.post('/login',loginUser);
router.get('/profile',protect,(req,res)=>{
  res.json({message:"You are Authorized",
    userId:req.user
  })
})

module.exports=router;