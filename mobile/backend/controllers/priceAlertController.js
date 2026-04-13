const priceAlertRepository = require("../dal/repositories/priceAlerts");
const alertService = require("../services/alertService");

// Get all alerts for the current user
const getAlerts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;
    
    const alerts = await priceAlertRepository.getByUser(userId, status);
    
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alerts",
      error: error.message,
    });
  }
};

// Get alert statistics
const getAlertStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const stats = await priceAlertRepository.getStats(userId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching alert stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alert statistics",
      error: error.message,
    });
  }
};

// Create a new alert
const createAlert = async (req, res) => {
  try {
    const userId = req.user._id;
    const { commodity, variety, city, condition, targetPrice } = req.body;
    
    // Validation
    if (!commodity || !condition || !targetPrice) {
      return res.status(400).json({
        success: false,
        message: "Commodity, condition, and target price are required",
      });
    }
    
    if (!["above", "below"].includes(condition)) {
      return res.status(400).json({
        success: false,
        message: "Condition must be 'above' or 'below'",
      });
    }
    
    if (targetPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Target price must be greater than 0",
      });
    }
    
    const validCommodities = ["Wheat", "Rice", "Cotton", "Sugar", "Maize", "Flour"];
    if (!validCommodities.includes(commodity)) {
      return res.status(400).json({
        success: false,
        message: `Commodity must be one of: ${validCommodities.join(", ")}`,
      });
    }
    
    const alert = await priceAlertRepository.createAlert(userId, {
      commodity,
      variety,
      city,
      condition,
      targetPrice,
    });
    
    // Immediately check if the alert should trigger
    const checkResult = await alertService.checkSingleAlert(alert, userId);
    
    res.status(201).json({
      success: true,
      message: checkResult.triggered 
        ? "Price alert created and triggered immediately!" 
        : "Price alert created successfully",
      data: {
        ...alert.toObject(),
        status: checkResult.triggered ? "triggered" : alert.status,
        currentPrice: checkResult.currentPrice,
        triggeredAt: checkResult.triggered ? new Date() : null,
      },
      triggered: checkResult.triggered,
    });
  } catch (error) {
    console.error("Error creating alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create alert",
      error: error.message,
    });
  }
};

// Update alert status
const updateAlertStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { status } = req.body;
    
    if (!["active", "triggered", "disabled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active', 'triggered', or 'disabled'",
      });
    }
    
    const alert = await priceAlertRepository.updateStatus(id, userId, status);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }
    
    res.json({
      success: true,
      message: "Alert status updated",
      data: alert,
    });
  } catch (error) {
    console.error("Error updating alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update alert",
      error: error.message,
    });
  }
};

// Delete an alert
const deleteAlert = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    
    const alert = await priceAlertRepository.deleteAlert(id, userId);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }
    
    res.json({
      success: true,
      message: "Alert deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete alert",
      error: error.message,
    });
  }
};

// Reactivate a triggered alert
const reactivateAlert = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    
    const alert = await priceAlertRepository.updateStatus(id, userId, "active");
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }
    
    // Clear triggered timestamp
    alert.triggeredAt = null;
    await alert.save();
    
    res.json({
      success: true,
      message: "Alert reactivated",
      data: alert,
    });
  } catch (error) {
    console.error("Error reactivating alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reactivate alert",
      error: error.message,
    });
  }
};

// Manually trigger alert check (for testing)
const checkAlerts = async (req, res) => {
  try {
    const result = await alertService.checkAndTriggerAlerts();
    
    res.json({
      success: true,
      message: `Alert check completed. ${result.triggered} alerts triggered.`,
      data: result,
    });
  } catch (error) {
    console.error("Error checking alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check alerts",
      error: error.message,
    });
  }
};

// Mark a single alert as seen
const markAlertAsSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    
    const alert = await priceAlertRepository.markAsSeen(id, userId);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }
    
    res.json({
      success: true,
      message: "Alert marked as seen",
      data: alert,
    });
  } catch (error) {
    console.error("Error marking alert as seen:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark alert as seen",
      error: error.message,
    });
  }
};

// Mark all triggered alerts as seen
const markAllAlertsSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const result = await priceAlertRepository.markAllAsSeen(userId);
    
    res.json({
      success: true,
      message: `${result.modifiedCount} alerts marked as seen`,
      data: result,
    });
  } catch (error) {
    console.error("Error marking all alerts as seen:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark alerts as seen",
      error: error.message,
    });
  }
};

module.exports = {
  getAlerts,
  getAlertStats,
  createAlert,
  updateAlertStatus,
  deleteAlert,
  reactivateAlert,
  checkAlerts,
  markAlertAsSeen,
  markAllAlertsSeen,
};
