const mongoose=require('mongoose');

const connectDb= async ()=>{
  try{
    const conn=await mongoose.connect(process.env.MONGO_URI);
    console.log("Database Connected", conn.connection.host);
  }
  catch(err){
    console.log("Database Connection failed:", err.message);
  }
} 
module.exports=connectDb;