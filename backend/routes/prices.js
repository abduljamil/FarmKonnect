const express = require("express");
const router = express.Router();
const priceController = require("../controllers/priceController");

router.get("/latest", priceController.getLatestPrices);
router.get("/history", priceController.getPriceHistory);
router.get("/commodities", priceController.getAvailableCommodities);
router.get("/cities", priceController.getAvailableCities);
router.get("/cities-by-filters", priceController.getCitiesByFilters);
router.get("/varieties/:commodity", priceController.getVarietiesByCommodity);

module.exports = router;
