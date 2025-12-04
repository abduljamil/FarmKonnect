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
