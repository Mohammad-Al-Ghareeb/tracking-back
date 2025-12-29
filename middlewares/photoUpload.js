const path = require("path");
const multer = require("multer");

// Photo Storage
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../images"));
  },
  filename: function (req, file, cb) {
    if (file) {
      cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname);
    } else {
      cb(null, false);
    }
  },
});

// Photo Upload Middleware
const photoUpload = multer({
  storage: photoStorage,
  fileFilter: function (req, file, cb) {
    cb(null, true);
    // if (file.mimetype.startsWith("image")) {
    // } else {
    //   cb({ message: "Unsupported file format" }, false);
    // }
  },
  limits: { fileSize: 1024 * 1024 * 30 }, // 1 megabyte
});

const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Datei ist zu groß." });
    }
  }
  next(err);
};

module.exports = { photoUpload, uploadErrorHandler };
