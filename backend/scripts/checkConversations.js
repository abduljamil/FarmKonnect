/**
 * Script to check conversation data
 * Run with: node scripts/checkConversations.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkConversations() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get all conversations
    const conversations = await db.collection('conversations').find({}).toArray();
    console.log(`Found ${conversations.length} conversations:\n`);

    for (const conv of conversations) {
      console.log(`Conversation: ${conv._id}`);
      console.log(`  Product ID: ${conv.product}`);
      console.log(`  Buyer: ${conv.buyer}`);
      console.log(`  Seller: ${conv.seller}`);

      // Check if the product exists in listings
      if (conv.product) {
        const listing = await db.collection('listings').findOne({ _id: conv.product });
        console.log(`  Product exists: ${listing ? 'YES - ' + listing.title : 'NO'}`);
      } else {
        console.log(`  Product exists: NO (product field is null/undefined)`);
      }
      console.log('');
    }

    // Also check what listings exist
    const listings = await db.collection('listings').find({}).limit(5).toArray();
    console.log(`\nSample listings (first 5):`);
    listings.forEach(l => {
      console.log(`  - ${l._id}: ${l.title}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkConversations();
