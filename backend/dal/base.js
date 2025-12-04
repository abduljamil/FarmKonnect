/**
 * Base Repository Class
 * Provides common CRUD operations for all repositories
 * Follow the Repository Pattern for data access abstraction
 */

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Find a single document by ID
   * @param {string} id - Document ID
   * @param {Object} options - Query options (select, populate, etc.)
   * @returns {Promise<Object|null>} Document or null
   */
  async findById(id, options = {}) {
    try {
      let query = this.model.findById(id);

      if (options.select) {
        query = query.select(options.select);
      }

      if (options.populate) {
        query = query.populate(options.populate);
      }

      return await query.exec();
    } catch (error) {
      throw new Error(`Error finding document by ID: ${error.message}`);
    }
  }

  /**
   * Find a single document by criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options (select, populate, etc.)
   * @returns {Promise<Object|null>} Document or null
   */
  async findOne(criteria, options = {}) {
    try {
      let query = this.model.findOne(criteria);

      if (options.select) {
        query = query.select(options.select);
      }

      if (options.populate) {
        query = query.populate(options.populate);
      }

      return await query.exec();
    } catch (error) {
      throw new Error(`Error finding document: ${error.message}`);
    }
  }

  /**
   * Find multiple documents by criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options (select, populate, sort, limit, skip)
   * @returns {Promise<Array>} Array of documents
   */
  async find(criteria = {}, options = {}) {
    try {
      let query = this.model.find(criteria);

      if (options.select) {
        query = query.select(options.select);
      }

      if (options.populate) {
        query = query.populate(options.populate);
      }

      if (options.sort) {
        query = query.sort(options.sort);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.skip) {
        query = query.skip(options.skip);
      }

      return await query.exec();
    } catch (error) {
      throw new Error(`Error finding documents: ${error.message}`);
    }
  }

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @returns {Promise<Object>} Created document
   */
  async create(data) {
    try {
      return await this.model.create(data);
    } catch (error) {
      throw new Error(`Error creating document: ${error.message}`);
    }
  }

  /**
   * Update a document by ID
   * @param {string} id - Document ID
   * @param {Object} updates - Fields to update
   * @param {Object} options - Update options (new, runValidators, etc.)
   * @returns {Promise<Object|null>} Updated document or null
   */
  async updateById(id, updates, options = {}) {
    try {
      const defaultOptions = {
        new: true, // Return updated document
        runValidators: true, // Run model validators
        ...options,
      };

      return await this.model.findByIdAndUpdate(
        id,
        { $set: updates },
        defaultOptions
      );
    } catch (error) {
      throw new Error(`Error updating document: ${error.message}`);
    }
  }

  /**
   * Update a single document by criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} updates - Fields to update
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} Updated document or null
   */
  async updateOne(criteria, updates, options = {}) {
    try {
      const defaultOptions = {
        new: true,
        runValidators: true,
        ...options,
      };

      return await this.model.findOneAndUpdate(
        criteria,
        { $set: updates },
        defaultOptions
      );
    } catch (error) {
      throw new Error(`Error updating document: ${error.message}`);
    }
  }

  /**
   * Update multiple documents
   * @param {Object} criteria - Search criteria
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  async updateMany(criteria, updates) {
    try {
      return await this.model.updateMany(criteria, { $set: updates });
    } catch (error) {
      throw new Error(`Error updating documents: ${error.message}`);
    }
  }

  /**
   * Delete a document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Deleted document or null
   */
  async deleteById(id) {
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (error) {
      throw new Error(`Error deleting document: ${error.message}`);
    }
  }

  /**
   * Delete a single document by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} Deleted document or null
   */
  async deleteOne(criteria) {
    try {
      return await this.model.findOneAndDelete(criteria);
    } catch (error) {
      throw new Error(`Error deleting document: ${error.message}`);
    }
  }

  /**
   * Delete multiple documents
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object>} Delete result
   */
  async deleteMany(criteria) {
    try {
      return await this.model.deleteMany(criteria);
    } catch (error) {
      throw new Error(`Error deleting documents: ${error.message}`);
    }
  }

  /**
   * Count documents matching criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<number>} Document count
   */
  async count(criteria = {}) {
    try {
      return await this.model.countDocuments(criteria);
    } catch (error) {
      throw new Error(`Error counting documents: ${error.message}`);
    }
  }

  /**
   * Check if document exists
   * @param {Object} criteria - Search criteria
   * @returns {Promise<boolean>} True if exists
   */
  async exists(criteria) {
    try {
      const doc = await this.model.exists(criteria);
      return !!doc;
    } catch (error) {
      throw new Error(`Error checking document existence: ${error.message}`);
    }
  }

  /**
   * Find with pagination
   * @param {Object} criteria - Search criteria
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Items per page
   * @param {Object} options - Additional query options (sort, select, populate)
   * @returns {Promise<Object>} Paginated result with data and metadata
   */
  async paginate(criteria = {}, page = 1, limit = 10, options = {}) {
    try {
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.find(criteria, { ...options, skip, limit }),
        this.count(criteria),
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new Error(`Error paginating documents: ${error.message}`);
    }
  }

  /**
   * Perform aggregation
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} Aggregation result
   */
  async aggregate(pipeline) {
    try {
      return await this.model.aggregate(pipeline);
    } catch (error) {
      throw new Error(`Error performing aggregation: ${error.message}`);
    }
  }
}

module.exports = BaseRepository;
