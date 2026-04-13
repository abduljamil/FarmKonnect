const mongoose = require('mongoose');

// Track database connection state
let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    connectionAttempts = 0;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

  } catch (error) {
    isConnected = false;
    connectionAttempts++;
    console.error(`❌ MongoDB Connection Error (Attempt ${connectionAttempts}/${MAX_RETRIES}): ${error.message}`);

    // Retry connection with exponential backoff
    if (connectionAttempts < MAX_RETRIES) {
      const retryDelay = RETRY_INTERVAL * connectionAttempts;
      console.log(`⏳ Retrying connection in ${retryDelay / 1000} seconds...`);
      setTimeout(connectDB, retryDelay);
    } else {
      console.error('❌ Max connection attempts reached. Server will continue without database.');
      console.error('❌ API requests requiring database will fail until connection is restored.');
    }
  }

  // Handle connection events
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
    isConnected = false;
    // Attempt to reconnect
    setTimeout(connectDB, RETRY_INTERVAL);
  });

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB reconnected');
    isConnected = true;
    connectionAttempts = 0;
  });
};

// Function to check if database is connected
const isDBConnected = () => {
  return isConnected && mongoose.connection.readyState === 1;
};

// Middleware to check database connection before processing requests
const checkDBConnection = (req, res, next) => {
  if (!isDBConnected()) {
    return res.status(503).json({
      success: false,
      error: 'SERVICE_UNAVAILABLE',
      message: 'Database connection is currently unavailable. Please try again later.',
    });
  }
  next();
};

module.exports = { connectDB, isDBConnected, checkDBConnection };
