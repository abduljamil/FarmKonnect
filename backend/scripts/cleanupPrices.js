// Cleanup script: removes commodity rows whose `commodity` field is NOT in
// the allow-list below.
//
// WARNING -- after the 2026-05 historical AMIS ingest, this collection holds
// 268k+ rows across rice variants ("Rice (IRRI)", "Rice Basmati Super (New)",
// ...) and "Seed Cotton (Phutti)". The old TARGET_COMMODITIES list excluded
// those, so running this script with the old list would WIPE most of the
// historical training data. The list below now includes every commodity we
// intentionally store.
//
// Even with the correct list, this script is dangerous. It now requires
// `--force` to actually delete; otherwise it runs in dry-run mode and prints
// the counts of what it WOULD remove.
//
//   node scripts/cleanupPrices.js              # dry-run (default)
//   node scripts/cleanupPrices.js --force      # actually delete

require('dotenv').config();
const mongoose = require('mongoose');
const CommodityPrice = require('../models/CommodityPrice');

const TARGET_COMMODITIES = [
  // Base / single-variety commodities
  'Wheat',
  'Maize',
  'Sugar',
  'Flour',
  'Cotton',
  'Rice',
  // Rice varieties (full-string commodities, variety=null)
  'Rice (IRRI)',
  'Rice Basmati Super (New)',
  'Rice Basmati Super (Old)',
  'Rice Basmati (385)',
  'Rice Kainat (New)',
  'Paddy Basmati',
  'Paddy (IRRI)',
  'Paddy Kainat',
  // Seed cotton variant
  'Seed Cotton (Phutti)',
  // Other commodities the live scraper writes
  'Millet',
  'Wheat Straw',
  'Barley(جو)',
];

const cleanupDatabase = async () => {
  const force = process.argv.includes('--force');
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    console.log(`Mode: ${force ? 'FORCE (will delete)' : 'DRY-RUN (no writes)'}`);

    const filter = { commodity: { $nin: TARGET_COMMODITIES } };
    const candidateCount = await CommodityPrice.countDocuments(filter);
    console.log(`Rows whose commodity is NOT in the allow-list: ${candidateCount}`);

    if (candidateCount > 0) {
      const samples = await CommodityPrice.distinct('commodity', filter);
      console.log(`Commodities that would be removed: ${JSON.stringify(samples)}`);
    }

    if (!force) {
      console.log('\nDry-run complete. Re-run with --force to actually delete.');
    } else {
      const result = await CommodityPrice.deleteMany(filter);
      console.log(`Deleted ${result.deletedCount} rows.`);
    }

    await mongoose.disconnect();
    console.log('Done.');
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
};

cleanupDatabase();
