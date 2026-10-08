const mongoose = require("mongoose")

const messageSchema=new mongoose.Schema({
  sender:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true
  },
  receiver:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true
  },
  message:{
    type:String,
    required:true,
    trim:true
  },
  kind: { type: String, enum: ["text", "call"], default: "text" },
  call: {
    type: { type: String, enum: ["audio", "video"] },
    status: { type: String, enum: ["completed", "missed", "declined", "unanswered"] },
    durationSeconds: { type: Number, default: 0 },
  },
  attachment: {
    url: { type: String },
    name: { type: String },
    mimeType: { type: String },
    size: { type: Number },
  },
  status:{
    type:String,
    enum:["sent","delivered","read"],
    default:"sent"
  },
  replyTo: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Message",
  default: null
  },
},{
timestamps:true
})

module.exports=mongoose.model("Message",messageSchema)
