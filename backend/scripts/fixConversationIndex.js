/**
 * Script to fix conversation indexes
 * Run with: node scripts/fixConversationIndex.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/FarmKonnect';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('conversations');

    // Get current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));

    // Drop old listing index if it exists
    const oldIndex = indexes.find(i => i.name === 'listing_1_buyer_1_seller_1');
    if (oldIndex) {
      console.log('Dropping old index: listing_1_buyer_1_seller_1');
      await collection.dropIndex('listing_1_buyer_1_seller_1');
      console.log('Old index dropped successfully');
    } else {
      console.log('Old index not found, skipping...');
    }

    // Check for and remove any conversations with null product
    const nullProductConvs = await collection.countDocuments({ product: null });
    if (nullProductConvs > 0) {
      console.log(`Found ${nullProductConvs} conversations with null product, removing...`);
      await collection.deleteMany({ product: null });
      console.log('Removed conversations with null product');
    }

    // Verify the correct index exists
    const updatedIndexes = await collection.indexes();
    const correctIndex = updatedIndexes.find(i => i.name === 'product_1_buyer_1_seller_1');
    if (!correctIndex) {
      console.log('Creating correct index: product_1_buyer_1_seller_1');
      await collection.createIndex(
        { product: 1, buyer: 1, seller: 1 },
        { unique: true }
      );
      console.log('Correct index created');
    } else {
      console.log('Correct index already exists');
    }

    console.log('\nFinal indexes:', (await collection.indexes()).map(i => i.name));
    console.log('\nDone! You can now restart the backend server.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixIndexes();
