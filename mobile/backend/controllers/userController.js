const User = require('../models/User');
const Listing = require('../models/Listing');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const PriceAlert = require('../models/PriceAlert');
const { deleteImage, getPublicIdFromUrl } = require('../config/cloudinary');

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, location, bio, avatar } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update avatar
exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: 'Avatar URL is required.',
      });
    }

    // Get old avatar to delete
    const oldUser = await User.findById(req.user._id);
    const oldAvatar = oldUser?.avatar;

    // Update with new avatar
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    );

    // Delete old avatar from Cloudinary if it exists
    if (oldAvatar) {
      try {
        const publicId = getPublicIdFromUrl(oldAvatar);
        if (publicId) {
          await deleteImage(publicId);
        }
      } catch (err) {
        console.error('Error deleting old avatar:', err);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully.',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete account
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    // Get user with password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // For Google OAuth users, password is not required
    if (user.authProvider === 'google') {
      // Skip password verification for Google users
    } else {
      // For local auth users, password is required
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required to delete account.',
        });
      }

      // Verify password
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Password is incorrect.',
        });
      }
    }

    // 1. Delete user's listings and their images from Cloudinary
    const userListings = await Listing.find({ seller: userId });
    for (const listing of userListings) {
      // Delete listing images from Cloudinary
      if (listing.images && listing.images.length > 0) {
        for (const imageUrl of listing.images) {
          try {
            const publicId = getPublicIdFromUrl(imageUrl);
            if (publicId) {
              await deleteImage(publicId);
            }
          } catch (err) {
            console.error('Error deleting listing image:', err);
          }
        }
      }
    }
    await Listing.deleteMany({ seller: userId });

    // 2. Delete user's messages
    await Message.deleteMany({ sender: userId });

    // 3. Delete conversations where user is buyer or seller
    const userConversations = await Conversation.find({
      $or: [{ buyer: userId }, { seller: userId }]
    });
    
    // Delete all messages in those conversations
    for (const conv of userConversations) {
      await Message.deleteMany({ conversation: conv._id });
    }
    
    // Delete the conversations
    await Conversation.deleteMany({
      $or: [{ buyer: userId }, { seller: userId }]
    });

    // 4. Delete user's price alerts
    await PriceAlert.deleteMany({ user: userId });

    // 5. Delete user avatar from Cloudinary if exists
    if (user.avatar) {
      try {
        const publicId = getPublicIdFromUrl(user.avatar);
        if (publicId) {
          await deleteImage(publicId);
        }
      } catch (err) {
        console.error('Error deleting avatar:', err);
      }
    }

    // 6. Delete user document
    await User.findByIdAndDelete(userId);

    // Clear the authentication cookie
    res.cookie('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0)
    });

    res.status(200).json({
      success: true,
      message: 'Account and all associated data deleted successfully.',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
