const BaseRepository = require("../base");
const CommodityPrice = require("../../models/CommodityPrice");

class PriceRepository extends BaseRepository {
  constructor() {
    super(CommodityPrice);
  }

  async getAvailableCommodities() {
    return await this.model.distinct("commodity");
  }

  async getVarietiesByCommodity(commodity) {
    return await this.model.distinct("variety", {
      commodity,
      variety: { $ne: null },
    });
  }

  async getAvailableCities() {
    return await this.model.distinct("city");
  }

  async getLatestPrices({ commodity, city, priceType = "FQP", limit = 20 } = {}) {
    const match = {};
    if (commodity) match.commodity = commodity;
    if (city) match.city = city;
    if (priceType) match.priceType = priceType;

    return await this.model
      .aggregate([
        { $match: match },
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: {
              commodity: "$commodity",
              variety: "$variety",
              city: "$city",
              priceType: "$priceType",
            },
            latest: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$latest" } },
        { $sort: { timestamp: -1 } },
        { $limit: Number(limit) },
      ])
      .exec();
  }

  async getPriceHistory({ commodity, variety, city, priceType = "FQP", days = 30 } = {}) {
    const match = {
      commodity,
      city,
      priceType,
    };

    if (variety) {
      match.variety = variety;
    } else {
      match.variety = null;
    }

    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    match.date = { $gte: since };

    return await this.model
      .aggregate([
        { $match: match },
        { $sort: { date: 1, timestamp: 1 } },
        {
          $group: {
            _id: "$date",
            price: { $last: "$price" },
            date: { $last: "$date" },
            lastUpdated: { $last: "$lastUpdated" },
          },
        },
        { $sort: { date: 1 } },
      ])
      .exec();
  }
}

module.exports = new PriceRepository();
