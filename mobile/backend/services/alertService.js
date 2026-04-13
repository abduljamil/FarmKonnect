/**
 * Alert Service - Handles price alert checking and notifications
 * This service runs periodically to check if any alerts should be triggered
 */

const PriceAlert = require("../models/PriceAlert");
const priceRepository = require("../dal/repositories/prices");

// Store io instance for notifications
let ioInstance = null;

/**
 * Set the Socket.io instance for sending notifications
 */
const setIO = (io) => {
  ioInstance = io;
};

/**
 * Send a notification to a user via Socket.io
 */
const sendNotification = (userId, notification) => {
  if (!ioInstance) {
    console.log("[Alert Service] Cannot send notification - no IO instance");
    return false;
  }

  const room = `user:${userId}`;
  console.log(`[Alert Service] Sending price_alert_triggered to room: ${room}`);
  // console.log("[Alert Service] Notification data:", JSON.stringify(notification, null, 2));

  // Check if room has any sockets
  const roomSockets = ioInstance.sockets.adapter.rooms.get(room);
  // console.log(`[Alert Service] Room ${room} has ${roomSockets ? roomSockets.size : 0} socket(s)`);

  // Emit to user's personal room
  ioInstance.to(room).emit("price_alert_triggered", notification);
  return true;
};

/**
 * Check all active alerts against current prices and trigger if conditions are met
 */
const checkAndTriggerAlerts = async () => {
  const startTime = Date.now();

  try {
    // Get all active alerts
    const activeAlerts = await PriceAlert.find({ status: "active" })
      .populate("user", "name email _id")
      .lean();

    if (activeAlerts.length === 0) {
      return { checked: 0, triggered: 0, notifications: 0 };
    }

    // Get latest prices for all commodities
    const latestPrices = await priceRepository.getLatestPrices({ limit: 500 });

    if (latestPrices.length === 0) {
      return { checked: 0, triggered: 0, notifications: 0 };
    }

    // Create a price lookup map for efficient matching
    // Key format: "commodity|variety|city" or "commodity||city" if no variety
    const priceMap = new Map();
    latestPrices.forEach((price) => {
      const key = `${price.commodity}|${price.variety || ""}|${price.city}`;
      priceMap.set(key, price);

      // Also store by commodity+city for alerts without variety
      const keyNoVariety = `${price.commodity}||${price.city}`;
      if (!priceMap.has(keyNoVariety)) {
        priceMap.set(keyNoVariety, price);
      }
    });

    let triggeredCount = 0;
    let notificationCount = 0;
    const triggeredAlerts = [];

    // Check each alert against current prices
    for (const alert of activeAlerts) {
      // Build the lookup key based on alert specificity
      let matchingPrice = null;

      // Try to find exact match first (with variety if specified)
      if (alert.variety && alert.city) {
        const exactKey = `${alert.commodity}|${alert.variety}|${alert.city}`;
        matchingPrice = priceMap.get(exactKey);
      } else if (alert.city) {
        // Match any variety in the specified city
        const cityKey = `${alert.commodity}||${alert.city}`;
        matchingPrice = priceMap.get(cityKey);

        // If not found, try with varieties
        if (!matchingPrice) {
          for (const [key, price] of priceMap) {
            if (key.startsWith(`${alert.commodity}|`) && key.endsWith(`|${alert.city}`)) {
              matchingPrice = price;
              break;
            }
          }
        }
      } else {
        // No city specified, match any city
        for (const [key, price] of priceMap) {
          if (key.startsWith(`${alert.commodity}|`)) {
            // If variety is specified, match it
            if (alert.variety) {
              if (key.includes(`|${alert.variety}|`)) {
                matchingPrice = price;
                break;
              }
            } else {
              matchingPrice = price;
              break;
            }
          }
        }
      }

      if (!matchingPrice) {
        continue; // No price data for this alert
      }

      const currentPrice = matchingPrice.price;

      // Check if alert condition is met
      let shouldTrigger = false;
      if (alert.condition === "above") {
        shouldTrigger = currentPrice >= alert.targetPrice;
      } else if (alert.condition === "below") {
        shouldTrigger = currentPrice <= alert.targetPrice;
      }

      if (shouldTrigger) {
        // Update alert to triggered status
        await PriceAlert.findByIdAndUpdate(alert._id, {
          status: "triggered",
          triggeredAt: new Date(),
          currentPrice: currentPrice,
          notificationSent: true,
        });

        triggeredCount++;
        triggeredAlerts.push({
          ...alert,
          currentPrice,
          matchedCity: matchingPrice.city,
          matchedVariety: matchingPrice.variety,
        });

        // Send notification to user
        if (alert.user && alert.user._id) {
          const notification = {
            type: "price_alert_triggered",
            alertId: alert._id,
            message: `🔔 Price Alert Triggered: ${alert.commodity}${alert.variety ? ` (${alert.variety})` : ""} is now ₨${currentPrice.toLocaleString()} - ${alert.condition === "above" ? "rose above" : "dropped below"} your target of ₨${alert.targetPrice.toLocaleString()}`,
            alert: {
              _id: alert._id,
              commodity: alert.commodity,
              variety: alert.variety,
              city: alert.city,
              condition: alert.condition,
              targetPrice: alert.targetPrice,
              currentPrice: currentPrice,
              triggeredAt: new Date(),
              matchedCity: matchingPrice.city,
              matchedVariety: matchingPrice.variety,
            },
            timestamp: new Date(),
          };

          const sent = sendNotification(alert.user._id.toString(), notification);
          if (sent) notificationCount++;
        }
      } else {
        // Update current price for tracking (optional)
        await PriceAlert.findByIdAndUpdate(alert._id, {
          currentPrice: currentPrice,
        });
      }
    }

    return {
      checked: activeAlerts.length,
      triggered: triggeredCount,
      notifications: notificationCount,
      triggeredAlerts,
    };
  } catch (error) {
    console.error("[Alert Service] Error checking alerts:", error.message);
    return { checked: 0, triggered: 0, notifications: 0, error: error.message };
  }
};

/**
 * Run the alert check immediately (for testing or manual trigger)
 */
const runImmediateCheck = async () => {
  return await checkAndTriggerAlerts();
};

/**
 * Check a single alert immediately after creation
 * Returns { triggered: boolean, currentPrice: number }
 */
const checkSingleAlert = async (alert, userId) => {
  try {
    // Get latest prices
    const latestPrices = await priceRepository.getLatestPrices({ limit: 500 });

    if (latestPrices.length === 0) {
      return { triggered: false, currentPrice: null };
    }

    // Create price lookup map
    const priceMap = new Map();
    latestPrices.forEach((price) => {
      const key = `${price.commodity}|${price.variety || ""}|${price.city}`;
      priceMap.set(key, price);

      const keyNoVariety = `${price.commodity}||${price.city}`;
      if (!priceMap.has(keyNoVariety)) {
        priceMap.set(keyNoVariety, price);
      }
    });

    // Find matching price
    let matchingPrice = null;

    if (alert.variety && alert.city) {
      const exactKey = `${alert.commodity}|${alert.variety}|${alert.city}`;
      matchingPrice = priceMap.get(exactKey);
    } else if (alert.city) {
      const cityKey = `${alert.commodity}||${alert.city}`;
      matchingPrice = priceMap.get(cityKey);

      if (!matchingPrice) {
        for (const [key, price] of priceMap) {
          if (key.startsWith(`${alert.commodity}|`) && key.endsWith(`|${alert.city}`)) {
            matchingPrice = price;
            break;
          }
        }
      }
    } else {
      for (const [key, price] of priceMap) {
        if (key.startsWith(`${alert.commodity}|`)) {
          if (alert.variety) {
            if (key.includes(`|${alert.variety}|`)) {
              matchingPrice = price;
              break;
            }
          } else {
            matchingPrice = price;
            break;
          }
        }
      }
    }

    if (!matchingPrice) {
      return { triggered: false, currentPrice: null };
    }

    const currentPrice = matchingPrice.price;

    // Check if alert condition is met
    let shouldTrigger = false;
    if (alert.condition === "above") {
      shouldTrigger = currentPrice >= alert.targetPrice;
    } else if (alert.condition === "below") {
      shouldTrigger = currentPrice <= alert.targetPrice;
    }

    if (shouldTrigger) {
      // Update alert to triggered status
      await PriceAlert.findByIdAndUpdate(alert._id, {
        status: "triggered",
        triggeredAt: new Date(),
        currentPrice: currentPrice,
        notificationSent: true,
      });

      // Send notification
      if (ioInstance && userId) {
        const notification = {
          type: "price_alert_triggered",
          alertId: alert._id,
          message: `🔔 Price Alert Triggered: ${alert.commodity}${alert.variety ? ` (${alert.variety})` : ""} is now ₨${currentPrice.toLocaleString()} - ${alert.condition === "above" ? "rose above" : "dropped below"} your target of ₨${alert.targetPrice.toLocaleString()}`,
          alert: {
            _id: alert._id,
            commodity: alert.commodity,
            variety: alert.variety,
            city: alert.city,
            condition: alert.condition,
            targetPrice: alert.targetPrice,
            currentPrice: currentPrice,
            triggeredAt: new Date(),
            matchedCity: matchingPrice.city,
            matchedVariety: matchingPrice.variety,
          },
          timestamp: new Date(),
        };

        sendNotification(userId.toString(), notification);
      }

      return { triggered: true, currentPrice };
    } else {
      // Update current price but don't trigger
      await PriceAlert.findByIdAndUpdate(alert._id, {
        currentPrice: currentPrice,
      });

      return { triggered: false, currentPrice };
    }
  } catch (error) {
    console.error("[Alert Service] Error checking single alert:", error.message);
    return { triggered: false, currentPrice: null, error: error.message };
  }
};

module.exports = {
  setIO,
  checkAndTriggerAlerts,
  runImmediateCheck,
  sendNotification,
  checkSingleAlert,
};
