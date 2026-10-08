const User=require("../models/User");

const getUsers= async (req,res)=>{
  try{
    const currentUser = await User.findById(req.user).select("friends");
    const users = currentUser?.friends?.length
      ? await User.find(
        { _id: { $in: currentUser.friends } },
        "name email profileImage isOnline lastSeen",
      )
      : [];
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
      "name email phone profileImage isOnline lastSeen"
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

const updateMyPhone = async (req, res) => {
  const phone = String(req.body.phone || "").replace(/\D/g, "");
  if (phone.length < 7 || phone.length > 15) {
    return res.status(400).json({ message: "Enter a valid mobile number with 7 to 15 digits." });
  }
  try {
    const user = await User.findByIdAndUpdate(req.user, { phone }, { new: true })
      .select("name email phone profileImage isOnline lastSeen");
    res.json({ message: "Mobile number saved.", user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This mobile number is already linked to another account." });
    }
    res.status(500).json({ message: "Could not save mobile number." });
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
    ).select("name email phone profileImage isOnline lastSeen");

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
module.exports={getUsers,getMyProfile,uploadProfileImage,updateMyPhone}
