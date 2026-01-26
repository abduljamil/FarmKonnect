const cloudinaryBase = require('cloudinary');
const cloudinary = cloudinaryBase.v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for listing images
const listingStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'farmkonnect/listings',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }],
  },
});

// Storage for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'farmkonnect/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto' }],
  },
});

// Storage for delivery proof images
const deliveryProofStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'farmkonnect/delivery-proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
  },
});

// Multer upload instances
const uploadListingImages = multer({
  storage: listingStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).array('images', 10); // Max 10 images per listing

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
}).single('avatar');

const uploadDeliveryProof = multer({
  storage: deliveryProofStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).array('images', 5); // Max 5 delivery proof images

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  const parentFolder = parts[parts.length - 3];
  const publicId = `${parentFolder}/${folder}/${filename.split('.')[0]}`;
  return publicId;
};

module.exports = {
  cloudinary,
  uploadListingImages,
  uploadAvatar,
  uploadDeliveryProof,
  deleteImage,
  getPublicIdFromUrl,
};
