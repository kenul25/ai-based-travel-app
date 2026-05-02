const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureUploadDir = (folder) => {
  const uploadDir = path.join(__dirname, `../uploads/${folder}`);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

const createStorage = (folder, prefix) => multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, ensureUploadDir(folder));
  },
  filename: function(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${prefix}-${unique}${path.extname(file.originalname)}`);
  }
});

// Check file type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Images Only!'));
  }
}

const createUpload = (folder, prefix) => multer({
  storage: createStorage(folder, prefix),
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});

const vehicleUpload = createUpload('vehicles', 'vehicle');
const reviewUpload = createUpload('reviews', 'review');

module.exports = vehicleUpload;
module.exports.reviewUpload = reviewUpload;
