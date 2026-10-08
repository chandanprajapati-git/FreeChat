const multer = require("multer")
const path= require("path")
const uploadDirectory = require("../config/uploadDirectory")

const storage= multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,uploadDirectory);
  },
  filename:(req,file,cb)=>{
    const uniqueName= Date.now()+"_"+Math.round(Math.random()*1e9)+path.extname(file.originalname)

    cb(null,uniqueName)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;

    const extension = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    const mimeType = allowedTypes.test(file.mimetype);

    if (extension && mimeType) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed"));
    }
  }
});

module.exports = upload;
