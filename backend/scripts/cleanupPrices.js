// Cleanup script to remove unwanted commodity data from MongoDB
// Run this script once to clean up old sugarcane and other unwanted data

require('dotenv').config();
const mongoose = require('mongoose');
const CommodityPrice = require('../models/CommodityPrice');

const TARGET_COMMODITIES = ['Wheat', 'Rice', 'Cotton', 'Sugar', 'Maize', 'Flour'];

const cleanupDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete all records that are not in our target commodities
    const result = await CommodityPrice.deleteMany({
      commodity: { $nin: TARGET_COMMODITIES }
    });

    console.log(`Deleted ${result.deletedCount} records for non-target commodities`);

    await mongoose.disconnect();
    console.log('Cleanup completed');
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
};

cleanupDatabase();
