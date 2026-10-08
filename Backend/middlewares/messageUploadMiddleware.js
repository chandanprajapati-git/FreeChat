const multer = require("multer");
const path = require("path");
const uploadDirectory = require("../config/uploadDirectory");

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_req, file, callback) => {
    const safeExtension = path.extname(file.originalname).slice(0, 12);
    callback(null, `${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExtension}`);
  },
});

const allowedMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif",
  "application/pdf", "text/plain", "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/aac",
]);

module.exports = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const mobileImageExtension = /\.(heic|heif|avif)$/i.test(file.originalname);
    if (allowedMimeTypes.has(file.mimetype) || mobileImageExtension) return callback(null, true);
    callback(new Error("Choose an image, document, or audio file of a supported type."));
  },
});
