const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  console.log('Collections in database:');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  - ${col.name}: ${count} documents`);
  }

  // Check if products collection exists
  const products = await db.collection('products').find({}).limit(3).toArray();
  if (products.length > 0) {
    console.log('\nSample products:');
    products.forEach(p => console.log(`  - ${p._id}: ${p.title}`));
  }

  await mongoose.disconnect();
}

check();
