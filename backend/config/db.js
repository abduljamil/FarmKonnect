const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
  
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });
};

module.exports = connectDB;
