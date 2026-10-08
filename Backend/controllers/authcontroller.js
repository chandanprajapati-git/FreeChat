const User=require('../models/User')
const bcrypt=require('bcryptjs')
const jwt=require('jsonwebtoken')

const registerUser= async (req,res)=>{
try{
  const {name,email,password,phone}=req.body;
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  if(!email|| !name||!password||!normalizedPhone){
    return res.status(400).json({message:"Name, email, mobile number, and password are required."})
  }
  if(normalizedPhone.length < 7 || normalizedPhone.length > 15){
    return res.status(400).json({message:"Enter a valid mobile number with 7 to 15 digits."})
  }
  const existingUser=await User.findOne({$or:[{email},{phone:normalizedPhone}]});
  if(existingUser){
    return res.status(409).json({message: existingUser.email === email ? "An account with this email already exists." : "An account with this mobile number already exists."});
  }
  const hashedPassword=await bcrypt.hash(password,10);

  const user=await User.create({
    name,
    email,
    phone: normalizedPhone,
    password: hashedPassword
  });
  res.status(201).json({
    message:"User Registerd successfully",
    user:{
      id:user._id,
      name: user.name,
      email:user.email,
      phone:user.phone
    }
  });
}
catch (error){
  if (error.code === 11000) {
    return res.status(409).json({ message: "An account with this email or mobile number already exists." });
  }
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
