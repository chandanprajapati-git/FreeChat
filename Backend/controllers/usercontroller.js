const User=require("../models/User");

const getUsers= async (req,res)=>{
  try{
    const users= await User.find(
      {_id:{$ne:req.user}},
      "name email profileImage isOnline lastSeen"
    );
    console.log("BACKEND USERS:", users);
    res.status(200).json(users);
  } 
  catch(error){
    res.status(500).json({
      message:"Server Error",
      error: error.message
    })
  }
}

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(
      req.user,
      "name email profileImage isOnline lastSeen"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.status(200).json(user);

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Profile image is required"
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user,
      {
        profileImage: imageUrl
      },
      { returnDocument: "after" }
    ).select("name email profileImage isOnline lastSeen");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.status(200).json({
      message: "Profile image uploaded successfully",
      user
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
module.exports={getUsers,getMyProfile,uploadProfileImage}