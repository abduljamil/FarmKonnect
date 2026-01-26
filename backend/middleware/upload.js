const { uploadListingImages, uploadAvatar, uploadDeliveryProof } = require('../config/cloudinary');

// Middleware wrapper for listing image uploads
const handleListingImageUpload = (req, res, next) => {
  uploadListingImages(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB per image.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum is 10 images.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading images.',
      });
    }
    next();
  });
};

// Middleware wrapper for avatar uploads
const handleAvatarUpload = (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 2MB.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading avatar.',
      });
    }
    next();
  });
};

// Middleware wrapper for delivery proof uploads
const handleDeliveryProofUpload = (req, res, next) => {
  uploadDeliveryProof(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB per image.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum is 5 images.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading images.',
      });
    }
    next();
  });
};

module.exports = {
  handleListingImageUpload,
  handleAvatarUpload,
  handleDeliveryProofUpload,
};
