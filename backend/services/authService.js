const { users } = require('../dal');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = '7d';

class AuthService {
  /**
   * Generate JWT token for a user
   * @param {string} userId - User's MongoDB ID
   * @returns {string} JWT token
   */
  generateToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRE,
    });
  }

  /**
   * Generate JWT token and return user data (for OAuth and email verification)
   * @param {Object} user - User document
   * @returns {Object} Token and user data
   */
  generateTokenForUser(user) {
    const token = this.generateToken(user._id);
    return {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        authProvider: user.authProvider,
      },
    };
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - User's email
   * @param {string} userData.password - User's password
   * @param {string} userData.role - User's role (buyer/seller/admin)
   * @returns {Object} Token and user data
   * @throws {Error} If user already exists
   */
  async registerUser(userData) {
    const { name, email, password, role } = userData;

    // Check if user already exists
    const emailExists = await users.emailExists(email);
    if (emailExists) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const user = await users.createUser({
      name,
      email,
      role: role || 'buyer',
    });

    // Generate token
    const token = this.generateToken(user._id);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  /**
   * Authenticate and login a user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Object} Token and user data
   * @throws {Error} If credentials are invalid
   */
  async loginUser(email, password) {
    // Find user and include password field
    const user = await users.findByEmailWithPassword(email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user._id);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  /**
   * Get user by ID
   * @param {string} userId - User's MongoDB ID
   * @returns {Object} User data
   * @throws {Error} If user not found
   */
  async getUserById(userId) {
    const user = await users.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      location: user.location,
      bio: user.bio,
      isEmailVerified: user.isEmailVerified,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update user profile
   * @param {string} userId - User's MongoDB ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated user data
   * @throws {Error} If user not found or email already taken
   */
  async updateUser(userId, updates) {
    // If email is being updated, check if it's already taken
    if (updates.email) {
      const emailExists = await users.emailExists(updates.email, userId);
      
      if (emailExists) {
        throw new Error('Email already in use');
      }
    }

    const user = await users.updateUser(userId, updates);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * Delete user account
   * @param {string} userId - User's MongoDB ID
   * @throws {Error} If user not found
   */
  async deleteUser(userId) {
    const user = await users.deleteUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return { message: 'User deleted successfully' };
  }

  /**
   * Get all users (admin only)
   * @param {Object} filters - Query filters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Object} Users list with pagination
   */
  async getAllUsers(filters = {}, page = 1, limit = 10) {
    const result = await users.getAllUsers(filters, page, limit);

    return {
      users: result.data.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      })),
      pagination: result.pagination,
    };
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get users count statistics
   * @returns {Object} Total users and count by role
   */
  async getUsersCount() {
    const roleStats = await users.getUserStatsByRole();

    // Calculate total from role stats
    const total = roleStats.reduce((sum, stat) => sum + stat.count, 0);

    // Convert array to object for easier access
    const byRole = {};
    roleStats.forEach(stat => {
      byRole[stat.role] = stat.count;
    });

    return {
      total,
      byRole,
    };
  }
}

module.exports = new AuthService();
