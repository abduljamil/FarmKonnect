const CommodityPrice = require("../models/CommodityPrice");

// Max window: ~20 years -- we now have AMIS history back to 2009 in Atlas.
// (The 90-day cap was tied to the old TTL index which has been dropped.)
const MAX_DAYS = 365 * 20;

const parseDays = (days, fallback = 30) => {
  const parsed = parseInt(days, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, MAX_DAYS);
};

exports.getLatestPrices = async (req, res) => {
  try {
    const { commodity, city, priceType = "FQP", limit = 20 } = req.query;

    const match = { priceType, excluded: { $ne: true } };
    if (commodity) {
      match.commodity = commodity;
    }
    if (city) {
      match.city = city;
    }

    // Get the latest prices with the two most recent entries per commodity/variety/city
    const pipeline = [
      { $match: match },
      { $sort: { date: -1, timestamp: -1 } },
      {
        $group: {
          _id: { commodity: "$commodity", variety: "$variety", city: "$city" },
          commodity: { $first: "$commodity" },
          variety: { $first: "$variety" },
          city: { $first: "$city" },
          price: { $first: "$price" },
          unit: { $first: "$unit" },
          priceType: { $first: "$priceType" },
          date: { $first: "$date" },
          timestamp: { $first: "$timestamp" },
          lastUpdated: { $first: "$lastUpdated" },
          // Get the last two prices for calculating change
          prices: { $push: "$price" },
        },
      },
      { $sort: { timestamp: -1 } },
      { $limit: parseInt(limit, 10) || 20 },
    ];

    // Index { priceType, date, timestamp } backs the $sort so this won't do a
    // blocking in-memory sort; allowDiskUse is a safety net for any unindexed path.
    const data = await CommodityPrice.aggregate(pipeline).allowDiskUse(true);

    // Calculate price change percentage for each item
    const dataWithChange = data.map(item => {
      let change = null;
      if (item.prices && item.prices.length >= 2) {
        const currentPrice = item.prices[0];
        const previousPrice = item.prices[1];
        if (previousPrice > 0) {
          change = parseFloat((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(1));
        }
      }

      // Remove the prices array from response, keep only the change
      const { prices, ...rest } = item;
      return { ...rest, change };
    });

    return res.status(200).json({
      success: true,
      data: dataWithChange,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch latest prices",
    });
  }
};

exports.getPriceHistory = async (req, res) => {
  try {
    const { commodity, city, variety, priceType = "FQP", days, date } = req.query;

    if (!commodity || !city) {
      return res.status(400).json({
        success: false,
        message: "commodity and city are required",
      });
    }

    const criteria = {
      commodity,
      city,
      priceType,
      excluded: { $ne: true },
    };

    // Handle specific date query
    if (date) {
      const queryDate = new Date(date);
      if (isNaN(queryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD",
        });
      }
      
      // Query for exact date
      const startOfDay = new Date(queryDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(queryDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      criteria.date = { $gte: startOfDay, $lte: endOfDay };
    } else {
      // Handle date range query
      const dayCount = parseDays(days, 30);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (dayCount - 1));
      
      criteria.date = { $gte: startDate, $lte: endDate };
    }

    if (variety) {
      criteria.variety = variety;
    } else {
      criteria.variety = null;
    }

    const data = await CommodityPrice.find(criteria)
      .sort({ date: 1 })
      .select({ commodity: 1, variety: 1, city: 1, price: 1, unit: 1, priceType: 1, date: 1, timestamp: 1, lastUpdated: 1 });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch price history",
    });
  }
};

exports.getAvailableCommodities = async (req, res) => {
  try {
    const commodities = await CommodityPrice.distinct("commodity", { excluded: { $ne: true } });
    return res.status(200).json({
      success: true,
      data: commodities.sort(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch commodities",
    });
  }
};

exports.getAvailableCities = async (req, res) => {
  try {
    const cities = await CommodityPrice.distinct("city");
    return res.status(200).json({
      success: true,
      data: cities.sort(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch cities",
    });
  }
};

exports.getVarietiesByCommodity = async (req, res) => {
  try {
    const { commodity } = req.params;
    if (!commodity) {
      return res.status(400).json({
        success: false,
        message: "commodity is required",
      });
    }

    const varieties = await CommodityPrice.distinct("variety", {
      commodity,
      variety: { $ne: null },
      excluded: { $ne: true },
    });

    return res.status(200).json({
      success: true,
      data: varieties.sort(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch varieties",
    });
  }
};

exports.getCitiesByFilters = async (req, res) => {
  try {
    const { commodity, variety } = req.query;

    if (!commodity) {
      return res.status(400).json({
        success: false,
        message: "commodity is required",
      });
    }

    const criteria = { commodity, excluded: { $ne: true } };
    // Only filter by variety if explicitly provided
    if (variety) {
      criteria.variety = variety;
    }
    // If no variety provided, return cities for all varieties of this commodity

    const cities = await CommodityPrice.distinct("city", criteria);

    return res.status(200).json({
      success: true,
      data: cities.sort(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch cities",
    });
  }
};

// Date-range coverage for a commodity+city series. Lets the UI show only the
// time-range options that actually contain data (e.g. hide 1W/1M/3M when the
// latest data point for that series is months old).
exports.getPriceCoverage = async (req, res) => {
  try {
    const { commodity, city, variety, priceType = "FQP" } = req.query;
    if (!commodity || !city) {
      return res.status(400).json({
        success: false,
        message: "commodity and city are required",
      });
    }

    // getPriceHistory's range queries only match Date-typed docs, so mirror that
    // here -- a few legacy string-dated docs would otherwise skew $min/$max.
    const match = { commodity, city, priceType, variety: variety || null, date: { $type: "date" }, excluded: { $ne: true } };
    const result = await CommodityPrice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          minDate: { $min: "$date" },
          maxDate: { $max: "$date" },
          count: { $sum: 1 },
        },
      },
    ]).allowDiskUse(true);

    const cov = result[0];
    return res.status(200).json({
      success: true,
      data: cov
        ? { minDate: cov.minDate, maxDate: cov.maxDate, count: cov.count }
        : { minDate: null, maxDate: null, count: 0 },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch coverage",
    });
  }
};
