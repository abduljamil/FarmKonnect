require("dotenv").config();
const express = require("express");
const http = require("http");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const listingRoutes = require("./routes/listings");
const initializeSocket = require("./config/socket");

const app = express();
const server = http.createServer(app);
const port = 3000;

// Initialize Socket.io
const io = initializeSocket(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io instance available to routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// CORS middleware (for development)
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/listings", listingRoutes);

app.get("/message", (req, res) => {
  res.send("Hello from the backend!");
});

// Start server and connect to database
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Then start the server
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
