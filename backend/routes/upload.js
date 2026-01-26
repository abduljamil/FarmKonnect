const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { handleListingImageUpload, handleAvatarUpload, handleDeliveryProofUpload } = require('../middleware/upload');
const { deleteImage, getPublicIdFromUrl } = require('../config/cloudinary');

// Upload listing images
router.post('/listings', protect, handleListingImageUpload, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded.',
      });
    }

    const imageUrls = req.files.map((file) => file.path || file.secure_url);

    res.status(200).json({
      success: true,
      message: `${imageUrls.length} image(s) uploaded successfully.`,
      data: {
        images: imageUrls,
      },
    });
  } catch (error) {
    console.error('Error uploading listing images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading images.',
    });
  }
});

// Upload delivery proof images
router.post('/delivery-proof', protect, handleDeliveryProofUpload, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded.',
      });
    }

    const imageUrls = req.files.map((file) => file.path || file.secure_url);

    res.status(200).json({
      success: true,
      message: `${imageUrls.length} delivery proof image(s) uploaded successfully.`,
      data: {
        images: imageUrls,
      },
    });
  } catch (error) {
    console.error('Error uploading delivery proof images:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading images.',
    });
  }
});

// Upload avatar
router.post('/avatar', protect, handleAvatarUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar uploaded.',
      });
    }

    const avatarUrl = req.file.path;

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully.',
      data: {
        avatar: avatarUrl,
      },
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading avatar.',
    });
  }
});

// Delete image
router.delete('/', protect, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required.',
      });
    }

    const publicId = getPublicIdFromUrl(imageUrl);
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image URL.',
      });
    }

    await deleteImage(publicId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting image.',
    });
  }
});

module.exports = router;
