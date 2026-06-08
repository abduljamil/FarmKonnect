const express = require("express");
const router = express.Router();
const priceController = require("../controllers/priceController");

// Light caching for public read endpoints. Daily price scraper writes once
// per day; charts can tolerate up to 5 min stale data and this saves a lot
// of Atlas round-trips on the dashboard's ticker + chart polling.
const cache = (seconds) => (req, res, next) => {
  res.set("Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
  next();
};

router.get("/latest",    cache(60),  priceController.getLatestPrices);
router.get("/history",   cache(300), priceController.getPriceHistory);
router.get("/forecast",  cache(600), priceController.getForecast);   // forecasts only refresh weekly
router.get("/coverage",  cache(900), priceController.getPriceCoverage);
router.get("/commodities", cache(3600), priceController.getAvailableCommodities);
router.get("/cities",      cache(3600), priceController.getAvailableCities);
router.get("/cities-by-filters", cache(3600), priceController.getCitiesByFilters);
router.get("/varieties/:commodity", cache(3600), priceController.getVarietiesByCommodity);

module.exports = router;
