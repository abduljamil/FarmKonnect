const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.patch('/avatar', userController.updateAvatar);
router.put('/password', userController.changePassword);
router.delete('/account', userController.deleteAccount);

module.exports = router;
