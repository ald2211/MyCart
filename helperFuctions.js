const multer = require("multer");

const fileType = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = fileType[file.mimetype];
    let uploadError = new Error("Invalid image type");
    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, "public/uploads", (err, success) => {
      if (err) {
        throw err;
      }
    });
  },
  filename: function (req, file, cb) {
    const filename = file.originalname.split("").join("-");
    const extension = fileType[file.mimetype];
    cb(null, `${filename}-${Date.now}.${extension}`, (err, success) => {
      if (err) {
        throw err;
      }
    });
  },
});

const upload = multer({ storage: storage });
module.exports = upload;
