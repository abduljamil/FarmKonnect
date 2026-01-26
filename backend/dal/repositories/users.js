const BaseRepository = require('../base');
const User = require('../../models/User');

/**
 * User Repository
 * Handles all data access operations for User model
 */

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Find user by email
   * @param {string} email - User's email
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} User document or null
   */
  async findByEmail(email, options = {}) {
    return await this.findOne({ email: email.toLowerCase() }, options);
  }

  /**
   * Find user by email with password field included
   * Used for authentication
   * @param {string} email - User's email
   * @returns {Promise<Object|null>} User document with password or null
   */
  async findByEmailWithPassword(email) {
    return await this.findOne(
      { email: email.toLowerCase() },
      { select: '+password' }
    );
  }

  /**
   * Check if email already exists
   * @param {string} email - Email to check
   * @param {string} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if email exists
   */

  async emailExists(email, excludeUserId = null) {
    const criteria = { email: email.toLowerCase() };
    
    if (excludeUserId) {
      criteria._id = { $ne: excludeUserId };
    }

    return await this.exists(criteria);
  }

  /**
   * Find users by role
   * @param {string} role - User role (buyer, seller, admin)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of users
   */
  async findByRole(role, options = {}) {
    return await this.find({ role }, options);
  }

  /**
   * Get all users with pagination and filters
   * @param {Object} filters - Query filters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Object} options - Additional options (sort, select)
   * @returns {Promise<Object>} Paginated users
   */
  async getAllUsers(filters = {}, page = 1, limit = 10, options = {}) {
    const defaultOptions = {
      sort: { createdAt: -1 },
      select: '-password',
      ...options,
    };

    return await this.paginate(filters, page, limit, defaultOptions);
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    const { name, email, password, role } = userData;
    
    return await this.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'buyer',
    });
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated user
   */
  async updateUser(userId, updates) {
    // Ensure email is lowercase if it's being updated
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
    }

    return await this.updateById(userId, updates);
  }

  /**
   * Delete user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Deleted user
   */
  async deleteUser(userId) {
    return await this.deleteById(userId);
  }

  /**
   * Get user statistics by role
   * @returns {Promise<Array>} Role statistics
   */
  async getUserStatsByRole() {
    return await this.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          role: '$_id',
          count: 1,
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
  }

  /**
   * Get recently registered users
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Recent users
   */
  async getRecentUsers(limit = 10) {
    return await this.find(
      {},
      {
        select: '-password',
        sort: { createdAt: -1 },
        limit,
      }
    );
  }

  /**
   * Search users by name or email
   * @param {string} searchTerm - Search term
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated search results
   */
  async searchUsers(searchTerm, page = 1, limit = 10) {
    const criteria = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
      ],
    };

    return await this.paginate(criteria, page, limit, {
      select: '-password',
      sort: { createdAt: -1 },
    });
  }

  /**
   * Count users by role
   * @param {string} role - User role
   * @returns {Promise<number>} User count
   */
  async countByRole(role) {
    return await this.count({ role });
  }

  /**
   * Get users created within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Users in date range
   */
  async getUsersByDateRange(startDate, endDate) {
    return await this.find(
      {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      {
        select: '-password',
        sort: { createdAt: -1 },
      }
    );
  }
}

module.exports = new UserRepository();
