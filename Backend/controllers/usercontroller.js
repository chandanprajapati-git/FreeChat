const User=require("../models/User");

const getUsers= async (req,res)=>{
  try{
    const currentUser = await User.findById(req.user).select("friends");
    const users = currentUser?.friends?.length
      ? await User.find(
        { _id: { $in: currentUser.friends } },
        "name email profileImage status isAnonymous isOnline lastSeen",
      )
      : [];
    res.status(200).json(users.map((user) => {
      if (!user.isAnonymous) return user;
      return { ...user.toObject(), name: "Anonymous", email: "", profileImage: "", status: "", isOnline: false, lastSeen: null };
    }));
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
      "name email phone profileImage status isAnonymous isOnline lastSeen"
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

const updateMyStatus = async (req, res) => {
  const status = String(req.body.status || "").trim();
  if (status.length > 160) return res.status(400).json({ message: "Status must be 160 characters or fewer." });
  try {
    const user = await User.findByIdAndUpdate(req.user, { status }, { new: true })
      .select("status isAnonymous friends");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.isAnonymous) {
      const io = req.app.get("io");
      const onlineUsers = require("../socket/socketManager");
      for (const friendId of user.friends) {
        const socketId = onlineUsers.get(String(friendId));
        if (socketId) io.to(socketId).emit("profileStatusChanged", { userId: String(user._id), status: user.status || "" });
      }
    }
    res.json({ message: "Status updated.", status: user.status || "" });
  } catch {
    res.status(500).json({ message: "Could not update your status." });
  }
};

const updatePrivacy = async (req, res) => {
  if (typeof req.body.isAnonymous !== "boolean") {
    return res.status(400).json({ message: "Choose whether your profile is visible." });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.user,
      { isAnonymous: req.body.isAnonymous },
      { new: true },
    ).select("name email phone profileImage status isAnonymous isOnline lastSeen friends");
    if (!user) return res.status(404).json({ message: "User not found." });

    const hidden = user.isAnonymous;
    const payload = {
      userId: String(user._id),
      isAnonymous: hidden,
      name: hidden ? "Anonymous" : user.name,
      email: hidden ? "" : user.email,
      profileImage: hidden ? "" : user.profileImage,
      status: hidden ? "" : user.status || "",
      isOnline: hidden ? false : user.isOnline,
      lastSeen: hidden ? null : user.lastSeen,
    };
    const io = req.app.get("io");
    const onlineUsers = require("../socket/socketManager");
    for (const friendId of user.friends) {
      const socketId = onlineUsers.get(String(friendId));
      if (socketId) io.to(socketId).emit("profilePrivacyChanged", payload);
    }
    res.json({ message: "Profile visibility updated.", user: { isAnonymous: hidden } });
  } catch (error) {
    res.status(500).json({ message: "Could not update profile visibility." });
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
module.exports={getUsers,getMyProfile,uploadProfileImage,updateMyPhone,updatePrivacy,updateMyStatus}
