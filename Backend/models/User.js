const mongoose= require('mongoose')

const userSchema=new mongoose.Schema({
  name:{
    type:String,
    required:true,
    trim:true
  },
  email:{
    type:String,
    required:true,
    trim:true,
    unique:true
  },
  phone: {
    type: String,
    trim: true,
  },
  password:{
    type:String,
    required:true
  },
  profileImage:{
      type:String,
      default:""
    },
  isAnonymous:{
    type:Boolean,
    default:false
  },
  isOnline:{
    type:Boolean,
    default:false
  },
  lastSeen:{
    type:Date,
    default:null
  },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
},
  {
    timestamps:true
  }
);
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } },
);
module.exports=mongoose.model("User",userSchema)
