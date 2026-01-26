
require("dotenv").config();
const express = require("express");
const http = require("http");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const { connectDB, isDBConnected, checkDBConnection } = require("./config/db");
const configurePassport = require("./config/passport");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const listingRoutes = require("./routes/listings");
const priceRoutes = require("./routes/prices");
const uploadRoutes = require("./routes/upload");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const weatherRoutes = require("./routes/weather");
const priceAlertRoutes = require("./routes/priceAlerts");
const paymentRoutes = require("./routes/payments");
const reviewRoutes = require("./routes/reviews");
const initializeSocket = require("./config/socket");
const { runScraper } = require("./services/scraperService");
const alertService = require("./services/alertService");
const cron = require("node-cron");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error.message);
  console.error(error.stack);
  // Don't exit - keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit - keep the server running
});

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// Trust Proxy (Required for Nginx/AWS LB)
app.set("trust proxy", 1);

// Initialize Socket.io
const io = initializeSocket(server);

// Configure Passport for Google OAuth
configurePassport();


app.set('trust proxy', 1);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit for dashboard burst
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health check endpoint
  skip: (req, res) => req.path === '/api/health'
});





// CORS middleware - MUST be before other middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost',
    'http://127.0.0.1'
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(generalLimiter);

// Session configuration (Merged from current version)
app.use(session({
  secret: process.env.SESSION_SECRET || 'farmkonnect-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Make io instance available to routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Static files (Merged from current version)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/prices", priceRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/alerts", priceAlertRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use('/api/support', require('./routes/support')); // Merged from current version

app.get("/", (req, res) => {
  res.send("FarmKonnect API is running...");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  const dbConnected = isDBConnected();
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    status: dbConnected ? 'healthy' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (Merged from current version)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong on the server'
  });
});

// Start server and connect to database
const startServer = async () => {
  // Start the server first so it can respond to health checks
  server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });

  // Then attempt to connect to database (non-blocking)
  try {
    await connectDB();
  } catch (error) {
    console.error('⚠️ Initial database connection failed:', error.message);
    console.log('⚠️ Server is running but database features will be unavailable until connection is restored.');
  }

  // Initialize alert service with Socket.io instance
  alertService.setIO(io);

  // Don't error if scraper service fails in dev environment or if dependencies missing
  try {
    const initialScrape = await runScraper();
    if (initialScrape && !initialScrape.started) {
      console.warn(initialScrape.message);
    }

    // Scraper cron job - runs every hour
    cron.schedule("0 * * * *", () => {
      const result = runScraper();
      if (!result.started && result.status === "running") {
        console.warn(result.message);
      }
    });
  } catch (e) {
    console.warn("Scraper service initialization failed:", e.message);
  }

  // Price Alert Check cron job - runs every 5 minutes (only if DB is connected)
  cron.schedule("*/5 * * * *", async () => {
    if (!isDBConnected()) {
      console.warn("[Cron] Skipping price alert check - database not connected");
      return;
    }
    try {
      await alertService.checkAndTriggerAlerts();
    } catch (err) {
      console.error("[Cron] Price alert check failed:", err.message);
    }
  });

  // Run initial alert check after server starts (only if DB is connected)
  setTimeout(async () => {
    if (!isDBConnected()) {
      console.warn("Skipping initial price alert check - database not connected");
      return;
    }
    try {
      await alertService.checkAndTriggerAlerts();
    } catch (err) {
      console.error("Initial price alert check failed:", err.message);
    }
  }, 5000);
};

startServer();
