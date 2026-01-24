const authService = require('../services/authService');

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      ...result,
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Determine appropriate status code
    const statusCode = error.message.includes('already exists') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error registering user',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/signin
// @access  Public
exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const result = await authService.loginUser(email, password);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    console.error('Signin error:', error);
    
    // Determine appropriate status code
    const statusCode = error.message.includes('Invalid') ? 401 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error logging in',
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);
    
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error fetching user',
    });
  }
};
// @desc    Get users count
// @route   GET /api/auth/stats/users
// @access  Private
exports.getUsersCount = async (req, res) => {
  try {
    const result = await authService.getUsersCount();
    
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get users count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users count',
    });
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await authService.getAllUsers({}, page, limit);
    
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
    });
  }
};

// @desc    Create user (Admin)
// @route   POST /api/auth/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.user
    });
  } catch (error) {
    console.error('Create user error:', error);
    const statusCode = error.message.includes('already exists') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error creating user',
    });
  }
};

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const result = await authService.updateUser(req.params.id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: result,
    });
  } catch (error) {
    console.error('Update user error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error updating user',
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    await authService.deleteUser(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error deleting user',
    });
  }
};
