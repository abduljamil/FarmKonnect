const mongoose = require('mongoose');
const CommodityPrice = require('../models/CommodityPrice');
require('dotenv').config();

const deleteAllPrices = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Delete ALL records
    const result = await CommodityPrice.deleteMany({});

    console.log(`Deleted ${result.deletedCount} records`);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    console.log('All price data deleted. Run the scraper to get fresh data with new variety parsing.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

deleteAllPrices();
