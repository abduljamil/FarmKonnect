// One-shot migration: drop the 90-day TTL index on the `commodityprices`
// collection so historical data (2009-present) is no longer auto-deleted.
//
// Safe to re-run -- if the index is already gone, the script just reports
// "no TTL index found" and exits cleanly.
//
// Usage:
//   cd backend
//   node scripts/dropTtlIndex.js

require('dotenv').config();
const mongoose = require('mongoose');

const TARGET_COLLECTION = 'commodityprices';

(async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI not set in env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.db.collection(TARGET_COLLECTION);
    const indexes = await collection.indexes();

    const ttlIndex = indexes.find(
      (ix) => ix.expireAfterSeconds !== undefined
    );

    if (!ttlIndex) {
      console.log('No TTL index found on `commodityprices`. Nothing to do.');
    } else {
      console.log(
        `Found TTL index "${ttlIndex.name}" (expireAfterSeconds=${ttlIndex.expireAfterSeconds}). Dropping...`
      );
      await collection.dropIndex(ttlIndex.name);
      console.log(`Dropped index "${ttlIndex.name}".`);
    }

    // Verify
    const indexesAfter = await collection.indexes();
    console.log('\nRemaining indexes on `commodityprices`:');
    indexesAfter.forEach((ix) => {
      const ttl =
        ix.expireAfterSeconds !== undefined
          ? `  (TTL: ${ix.expireAfterSeconds}s)`
          : '';
      console.log(`  - ${ix.name}: ${JSON.stringify(ix.key)}${ttl}`);
    });

    await mongoose.disconnect();
    console.log('\nDone.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
