const mongoose = require('mongoose');
const CommodityPrice = require('../models/CommodityPrice');
require('dotenv').config();

const checkVarieties = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get all varieties for Rice
    const riceVarieties = await CommodityPrice.distinct('variety', { 
      commodity: 'Rice', 
      variety: { $ne: null } 
    });
    console.log('\nRice varieties found:', riceVarieties);

    // Get sample records for Rice
    const riceSamples = await CommodityPrice.find({ commodity: 'Rice' })
      .select('commodity variety city price date')
      .limit(20)
      .sort({ date: -1 });
    
    console.log('\nSample Rice records:');
    riceSamples.forEach(record => {
      console.log(`  - ${record.commodity} (${record.variety || 'no variety'}) - ${record.city} - Rs ${record.price}`);
    });

    // Check all commodities and their varieties
    const allCommodities = await CommodityPrice.distinct('commodity');
    console.log('\nAll commodities and their varieties:');
    for (const commodity of allCommodities) {
      const varieties = await CommodityPrice.distinct('variety', { 
        commodity, 
        variety: { $ne: null } 
      });
      console.log(`  ${commodity}: ${varieties.length > 0 ? varieties.join(', ') : 'no varieties'}`);
    }

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkVarieties();
