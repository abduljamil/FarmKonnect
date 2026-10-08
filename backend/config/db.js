const mongoose = require('mongoose');

// Track database connection state
let isConnected = false;
let connectionAttempts = 0;
let listenersAttached = false;
const RETRY_INTERVAL = 5000; // 5 seconds
const MAX_RETRY_INTERVAL = 60000; // cap backoff at 1 minute

// Attach connection event handlers exactly once. They used to be registered
// inside connectDB(), so every retry added another set, and every
// 'disconnected' handler scheduled yet another connectDB(). During the
// 2026-09-30 Atlas DNS outage that doubled each round, exhausted memory and
// wrote ~4.8 GB of logs. After a drop the MongoDB driver reconnects on its
// own, so these handlers only track state and log.
const attachListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    if (isConnected) {
      console.log('⚠️ MongoDB disconnected. Driver will reconnect automatically...');
    }
    isConnected = false;
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
    isConnected = true;
  });
};

const connectDB = async () => {
  attachListeners();

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

    // Retry the initial connection with capped exponential backoff. Never give
    // up: a short Atlas/DNS outage at boot used to leave the API without a
    // database until the container was restarted by hand.
    const retryDelay = Math.min(RETRY_INTERVAL * 2 ** (connectionAttempts - 1), MAX_RETRY_INTERVAL);
    console.error(`❌ MongoDB Connection Error (Attempt ${connectionAttempts}): ${error.message}`);
    console.log(`⏳ Retrying connection in ${retryDelay / 1000} seconds...`);
    setTimeout(connectDB, retryDelay);
  }
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
