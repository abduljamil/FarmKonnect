const BaseRepository = require("../base");
const PriceAlert = require("../../models/PriceAlert");

class PriceAlertRepository extends BaseRepository {
  constructor() {
    super(PriceAlert);
  }

  /**
   * Get all alerts for a user
   */
  async getByUser(userId, status = null) {
    const query = { user: userId };
    if (status) {
      query.status = status;
    }
    return this.model
      .find(query)
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get active alerts for a specific commodity (for price checking)
   */
  async getActiveAlertsForCommodity(commodity, city = null) {
    const query = {
      commodity,
      status: "active",
    };
    
    if (city) {
      query.$or = [{ city: city }, { city: null }];
    }
    
    return this.model
      .find(query)
      .populate("user", "name email")
      .lean();
  }

  /**
   * Create a new price alert
   */
  async createAlert(userId, alertData) {
    const alert = new this.model({
      user: userId,
      commodity: alertData.commodity,
      variety: alertData.variety || null,
      city: alertData.city || null,
      condition: alertData.condition,
      targetPrice: alertData.targetPrice,
      status: "active",
    });
    
    return alert.save();
  }

  /**
   * Update alert status
   */
  async updateStatus(alertId, userId, status) {
    return this.model.findOneAndUpdate(
      { _id: alertId, user: userId },
      { 
        status,
        ...(status === "triggered" ? { triggeredAt: new Date() } : {})
      },
      { new: true }
    );
  }

  /**
   * Update current price for matching alerts
   */
  async updateCurrentPrice(commodity, city, currentPrice) {
    const query = {
      commodity,
      status: "active",
    };
    
    if (city) {
      query.$or = [{ city: city }, { city: null }];
    }
    
    return this.model.updateMany(query, { currentPrice });
  }

  /**
   * Trigger alerts that meet their conditions
   */
  async triggerMatchingAlerts(commodity, city, currentPrice) {
    // First update all matching alerts with current price
    await this.updateCurrentPrice(commodity, city, currentPrice);
    
    // Find and trigger alerts that meet conditions
    const triggeredAbove = await this.model.updateMany(
      {
        commodity,
        status: "active",
        condition: "above",
        targetPrice: { $lte: currentPrice },
        $or: city ? [{ city: city }, { city: null }] : [{ city: null }],
      },
      {
        status: "triggered",
        triggeredAt: new Date(),
        currentPrice,
      }
    );
    
    const triggeredBelow = await this.model.updateMany(
      {
        commodity,
        status: "active",
        condition: "below",
        targetPrice: { $gte: currentPrice },
        $or: city ? [{ city: city }, { city: null }] : [{ city: null }],
      },
      {
        status: "triggered",
        triggeredAt: new Date(),
        currentPrice,
      }
    );
    
    return {
      triggeredCount: triggeredAbove.modifiedCount + triggeredBelow.modifiedCount,
    };
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId, userId) {
    return this.model.findOneAndDelete({ _id: alertId, user: userId });
  }

  /**
   * Get alert statistics for a user
   */
  async getStats(userId) {
    const stats = await this.model.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    
    const result = {
      active: 0,
      triggered: 0,
      disabled: 0,
      total: 0,
    };
    
    stats.forEach((s) => {
      result[s._id] = s.count;
      result.total += s.count;
    });
    
    return result;
  }

  /**
   * Mark a single alert as seen
   */
  async markAsSeen(alertId, userId) {
    return this.model.findOneAndUpdate(
      { _id: alertId, user: userId },
      { seen: true },
      { new: true }
    );
  }

  /**
   * Mark all triggered alerts as seen for a user
   */
  async markAllAsSeen(userId) {
    return this.model.updateMany(
      { user: userId, status: "triggered", seen: false },
      { seen: true }
    );
  }
}

module.exports = new PriceAlertRepository();
