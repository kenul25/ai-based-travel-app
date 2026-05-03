const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const createStorage = (folder) => new CloudinaryStorage({
  cloudinary,
  params: {
    folder: `travel-app/${folder}`,
    allowed_formats: ['jpeg', 'jpg', 'png', 'webp'],
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
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

const createUpload = (folder) => multer({
  storage: createStorage(folder),
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});

const vehicleUpload = createUpload('vehicles');
const reviewUpload = createUpload('reviews');
const destinationUpload = createUpload('destinations');
const profileUpload = createUpload('profiles');

module.exports = vehicleUpload;
module.exports.reviewUpload = reviewUpload;
module.exports.destinationUpload = destinationUpload;
module.exports.profileUpload = profileUpload;
