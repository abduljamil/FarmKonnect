/**
 * Data Access Layer (DAL) - Central Export
 * Provides centralized access to all repositories
 */

const users = require('./repositories/users');

module.exports = {
  users,
  // Add other repositories here as you create them
  // e.g., products, orders, etc.
};
