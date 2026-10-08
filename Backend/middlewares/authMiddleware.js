const jwt = require("jsonwebtoken")

const protect= (req,res,next)=>{
  try{
    const authHeader= req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
      return res.status(400).json({message:"Not authorized , Token Missing"});
    }

    const token= authHeader.split(" ")[1];

    const decode =jwt.verify(
      token,
      process.env.JWT_SECRET
    )
    req.user=decode.userId;
    next()

  } catch(error){
    return res.status(401).json({message:"Invalid or Expired Token",
      error:error.message
    })
  }
};
module.exports=protect;