/**
 * Data Access Layer (DAL) - Central Export
 * Provides centralized access to all repositories
 */

const users = require('./repositories/users');
const listings = require('./repositories/listings');
const messages = require('./repositories/messages');
const conversations = require('./repositories/conversations');
const prices = require('./repositories/prices');
const priceAlerts = require('./repositories/priceAlerts');
const aiConversations = require('./repositories/aiConversations');
const aiMessages = require('./repositories/aiMessages');

module.exports = {
  users,
  listings,
  messages,
  conversations,
  prices,
  priceAlerts,
  aiConversations,
  aiMessages
};
