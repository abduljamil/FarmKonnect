const express = require("express");
const router = express.Router();
const priceAlertController = require("../controllers/priceAlertController");
const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// GET /api/alerts - Get all user's alerts
router.get("/", priceAlertController.getAlerts);

// GET /api/alerts/stats - Get alert statistics
router.get("/stats", priceAlertController.getAlertStats);

// POST /api/alerts/check - Manually trigger alert check (for testing)
router.post("/check", priceAlertController.checkAlerts);

// POST /api/alerts - Create a new alert
router.post("/", priceAlertController.createAlert);

// PATCH /api/alerts/:id - Update alert status
router.patch("/:id", priceAlertController.updateAlertStatus);

// POST /api/alerts/:id/reactivate - Reactivate a triggered alert
router.post("/:id/reactivate", priceAlertController.reactivateAlert);

// PATCH /api/alerts/:id/seen - Mark alert as seen
router.patch("/:id/seen", priceAlertController.markAlertAsSeen);

// PATCH /api/alerts/seen/all - Mark all triggered alerts as seen
router.patch("/seen/all", priceAlertController.markAllAlertsSeen);

// DELETE /api/alerts/:id - Delete an alert
router.delete("/:id", priceAlertController.deleteAlert);

module.exports = router;
