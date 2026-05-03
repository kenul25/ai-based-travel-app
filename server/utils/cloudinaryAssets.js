const cloudinary = require('../config/cloudinary');

const getCloudinaryPublicId = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
    return null;
  }

  const uploadMarker = '/upload/';
  const uploadIndex = url.indexOf(uploadMarker);
  if (uploadIndex === -1) return null;

  const afterUpload = url.slice(uploadIndex + uploadMarker.length);
  const withoutTransform = afterUpload.replace(/^(?:[^/]+\/)*v\d+\//, '');
  const withoutQuery = withoutTransform.split('?')[0];
  const withoutExtension = withoutQuery.replace(/\.[^/.]+$/, '');

  return decodeURIComponent(withoutExtension);
};

const deleteCloudinaryAsset = async (url) => {
  const publicId = getCloudinaryPublicId(url);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.warn(`Cloudinary cleanup failed for ${publicId}: ${error.message}`);
  }
};

const deleteCloudinaryAssets = async (urls = []) => {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  await Promise.all(uniqueUrls.map((url) => deleteCloudinaryAsset(url)));
};

module.exports = {
  deleteCloudinaryAsset,
  deleteCloudinaryAssets,
  getCloudinaryPublicId,
};
