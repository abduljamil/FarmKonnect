const express = require("express");
const router = express.Router();
const { protect, authorize, optionalAuth } = require("../middleware/auth");
const {
  createTicket,
  getMyTickets,
  getTicket,
  addMessage,
  updateTicketStatus,
} = require("../controllers/supportController");

// Public route with optional auth (for logged-in users, ticket is linked to account)
router.post("/tickets", optionalAuth, createTicket);

// Protected routes
router.get("/tickets", protect, getMyTickets);
router.get("/tickets/:id", protect, getTicket);
router.post("/tickets/:id/messages", protect, addMessage);
router.put("/tickets/:id/status", protect, authorize("admin"), updateTicketStatus);

module.exports = router;
