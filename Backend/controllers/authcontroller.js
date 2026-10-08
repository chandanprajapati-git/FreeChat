const User=require('../models/User')
const bcrypt=require('bcryptjs')
const jwt=require('jsonwebtoken')

const registerUser= async (req,res)=>{
try{
  const {name,email,password}=req.body;
  if(!email|| !name||!password){
    return res.status(400).json({message:"All Fields are Mandatory"})
  }
  const existingUser=await User.findOne({email});
  if(existingUser){
    return res.status(200).json({message:"User already Exist"});
  }
  const hashedPassword=await bcrypt.hash(password,10);

  const user=await User.create({
    name,
    email,
    password: hashedPassword
  });
  res.status(201).json({
    message:"User Registerd successfully",
    user:{
      id:user._id,
      name: user.name,
      email:user.email
    }
  });
}
catch (error){
  res.status(500).json({
    message:"Server Error",
    error: error.message
  });
}
}

const loginUser= async (req,res)=>{
  try{
    const{email,password}=req.body;

    if(!email || !password){
      return res.status(400).json({message:"Email and Password are required"})
    }

    const user=await User.findOne({email})
    if(!user){
      return res.status(400).json({message:"Invalid Email or Password"})
    }
    const isPasswordCorrect=await bcrypt.compare(password,user.password);
    if(!isPasswordCorrect){
      return res.status(404).json({message:"Invalid Email or Password"})
    }
    const token=jwt.sign(
      {userId:user._id},
      process.env.JWT_SECRET,
      {expiresIn:"1d"}
    );
    res.status(200).json({
      message:"Login Successful",
      token,
      user:{
        id:user._id,
        name:user.name,
        email:user.email
      }
    })
  } catch (error){
    res.status(500).json({
      message:"Server Error",
      error:error.message
    })
  }
}
module.exports={registerUser,loginUser}
