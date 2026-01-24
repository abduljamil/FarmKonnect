const express = require('express');
const router = express.Router();
const { signup, signin, getMe, getUsersCount, getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);

// Protected routes
router.get('/me', protect, getMe);
router.get('/stats/users', protect, getUsersCount);

// Admin routes for user management
router.get('/users', protect, getAllUsers);
router.post('/users', protect, createUser);
router.put('/users/:id', protect, updateUser);
router.delete('/users/:id', protect, deleteUser);

module.exports = router;
