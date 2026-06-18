# 🌾 FarmKonnect Mobile App

**Empowering Agriculture Digitally** - A comprehensive agricultural marketplace and management platform connecting farmers, buyers, and agricultural resources.

---

## 🎯 Overview

FarmKonnect is a React Native mobile application built with Expo that enables:

- **Farmers** to list and sell agricultural products
- **Buyers** to browse and purchase fresh agricultural goods  
- **Real-time chat** between buyers and sellers
- **Price tracking** with alerts for commodity prices
- **User authentication** with email/password and Google OAuth
- **Transaction management** with secure payment processing
- **Weather updates** for agricultural planning
- **Multi-language support** (English & Urdu)
- **User ratings & reviews** for trust and quality assurance
- **Privacy controls** and security settings

---

## ✨ Key Features

### 🔐 Authentication & Security
- Email/password registration and login
- Google OAuth integration
- JWT token-based authentication
- Password reset functionality
- Email verification
- Two-Factor Authentication (2FA)
- Privacy & Security settings
- Login history tracking

### 🏪 Marketplace
- Create agricultural product listings
- Multi-photo upload (up to 5 photos per listing)
- Category filtering (Crops, Livestock, Equipment, Fertilizers, Seeds, Other)
- Price-based search and filtering
- View detailed listing information
- Edit and manage your listings
- Delete listings with confirmation

### 💬 Real-time Chat
- Direct messaging between buyers and sellers
- Conversation management
- Real-time notifications via Socket.io
- Message persistence
- Typing indicators

### 💰 Transactions & Payments
- View transaction history
- Payment status tracking
- Escrow management
- JazzCash payment integration
- Delivery proof upload

### 📊 Price Tracking
- Real-time commodity price updates
- Price alerts - Get notified when prices reach target
- Historical price trends
- Price comparison across categories

### 🌍 Weather & Location
- Location-based weather updates
- Agricultural weather insights
- GPS location services

### 👤 User Profile & Settings
- Profile customization (name, bio, avatar)
- User ratings and reviews
- Language toggle (English/Urdu with persistence)
- Dark mode support
- Notification preferences
- Help & Support contact options

### 🎨 UI/UX
- Animated Welcome screen with bouncing arrow indicators
- Animated blobs background
- Dark theme (green accents #16a34a)
- Smooth transitions and animations
- Responsive design for various screen sizes

---

## 🛠️ Tech Stack

### Frontend (Mobile)
- **Framework:** React Native 0.81.5 via Expo 54.0
- **Navigation:** React Navigation 7
- **Styling:** NativeWind (Tailwind CSS)
- **Animations:** React Native Animated API
- **Real-time:** socket.io-client
- **Location Services:** expo-location
- **State Management:** React Context API + AsyncStorage
- **HTTP Client:** Axios
- **Internationalization:** i18next + react-i18next
- **Image Picker:** expo-image-picker
- **Icons:** lucide-react-native

### Backend (Reference)
- **Server:** Node.js + Express.js
- **Database:** MongoDB + Mongoose
- **Real-time:** Socket.io
- **Storage:** Cloudinary
- **Authentication:** JWT + Passport (Google OAuth)
- **Email:** Nodemailer
- **File Upload:** Multer
- **Password Hashing:** Bcryptjs
- **Session Store:** connect-mongo

---

## 🏗️ Architecture

### System Overview

FarmKonnect follows a **Client-Server architecture** with real-time communication:

**Frontend (Mobile):** React Native app on user's phone
↓ (HTTP via Axios)
**Backend (Server):** Node.js/Express API on cloud/localhost
↓ (Database queries)
**Database:** MongoDB stores all application data
↓ (Real-time WebSocket)
**External Services:** Cloudinary (images), Gmail (email), Google (OAuth), JazzCash (payments)

### Frontend Architecture

**Three-Layer Architecture:**

1. **Presentation Layer (Screens & Components)**
   - Auth screens (SignIn, SignUp, ForgotPassword)
   - Marketplace screens (Browse, Create, Edit listings)
   - Chat screens (Conversations, Messages)
   - User screens (Profile, Settings, Transactions)
   - Reusable UI components (Button, Card, Input, Badge)

2. **Business Logic Layer (Services & Hooks)**
   - API service (Axios with interceptors)
   - Auth service (Login, Register, OAuth)
   - Chat service (WebSocket messaging)
   - Listing service (CRUD operations)
   - Weather & Price services

3. **State Management Layer**
   - **AuthContext:** Global authentication state
   - **SocketContext:** WebSocket connection management
   - **AsyncStorage:** Local persistence for tokens, preferences
   - **Component State:** Local UI state using hooks

### Backend Architecture

**MVC + Service Layer Pattern:**

Request → Route → Middleware → Controller → Service → Model → Database
                                                ↓
                        External APIs (Cloudinary, Gmail, etc)

**Components:**

- **Routes:** API endpoints organized by feature (auth, listings, chat, etc)
- **Controllers:** Handle HTTP requests, call services, return responses
- **Services:** Business logic, authentication, email, payments
- **Models:** MongoDB schemas (User, Listing, Message, etc)
- **Middleware:** Authentication checks, file uploads, rate limiting
- **DAL (Data Access Layer):** Repository pattern for database interactions

### Data Flow

#### Authentication Flow
```
1. User enters credentials
2. Frontend sends to /api/auth/login
3. Backend verifies password (bcryptjs)
4. Backend generates JWT token
5. Frontend stores token in AsyncStorage
6. Token attached to all future requests via Axios interceptor
7. Backend validates JWT on protected routes
```

#### Real-time Chat Flow
```
1. Frontend connects to Socket.io server
2. User sends message
3. Frontend emits "sendMessage" event
4. Backend receives, saves to MongoDB
5. Backend broadcasts to recipient via Socket.io
6. Recipient's frontend listens and updates Chat screen
7. Message appears in real-time (no page refresh)
```

#### File Upload Flow
```
1. User selects images from gallery
2. Frontend reads file using expo-image-picker
3. Frontend converts to FormData with file
4. Frontend sends to /api/upload/listings
5. Backend receives with Multer middleware
6. Backend uploads to Cloudinary
7. Backend gets Cloudinary URL
8. Backend saves URL to MongoDB Listing
9. Frontend displays image from Cloudinary URL
```

### State Management Strategy

**Global State (Context API):**
```javascript
AuthContext
├── user (profile data)
├── token (JWT)
├── isLoading
└── login/logout/register functions

SocketContext
├── socket (connection)
├── isConnected
└── emit/on functions
```

**Local State (AsyncStorage):**
```javascript
- auth_token (persists after app restart)
- user_language (English/Urdu preference)
- theme_preference (Dark/Light mode)
- notification_settings
```

**Component State (React Hooks):**
```javascript
- Form inputs (useState)
- Loading states (useState)
- List data (useState)
- UI visibility (useState)
```

### API Communication Pattern

**Axios Instance with Interceptors:**
```javascript
1. Request Interceptor
   - Add JWT token to headers
   - Set base URL

2. Response Interceptor
   - Handle 401 (token expired)
   - Auto-refresh token if available
   - Log errors

3. Error Handling
   - Network errors
   - Validation errors
   - Server errors
```

### Real-time Features

**Socket.io Events:**

| Event | Direction | Purpose |
|-------|-----------|---------|
| `sendMessage` | Client→Server→Client | Send chat message |
| `receiveMessage` | Server→Client | Receive new message |
| `typing` | Client→Server→Client | Show typing indicator |
| `userOnline` | Client→Server→Broadcast | User status |
| `priceUpdate` | Server→Client | Price alert notification |

### Security Architecture

**Authentication Flow:**
```
User Credentials → Bcryptjs Hash → Compare → JWT Token
                                   ↓
                           AsyncStorage (Secure)
                                   ↓
                           Axios Interceptor
                                   ↓
                           Backend Validation
```

**Data Protection:**
- JWT tokens expire after 7 days
- Refresh tokens for long sessions
- HTTPS/TLS for data in transit
- MongoDB connection strings in .env (not in code)
- API keys secured (Cloudinary, Gmail, etc)

### Scalability Considerations

**Current Architecture Supports:**
- Real-time messaging via Socket.io
- Horizontal scaling with session persistence (connect-mongo)
- File storage on Cloudinary (no server storage)
- Database indexing for quick queries
- Rate limiting to prevent abuse

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Available Commands](#available-commands)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## 🚀 Prerequisites

Before you start, ensure you have the following installed on your system:

```bash
# Node.js (v16 or higher)
node --version    # Should be v16+
npm --version     # Should be v7+

# Git
git --version

# Expo CLI (install globally)
npm install -g expo-cli
expo --version

# MongoDB (choose one option below)
```

**MongoDB Options:**
- **Local:** [Download MongoDB Community](https://www.mongodb.com/try/download/community)
- **Cloud:** [MongoDB Atlas (Recommended for beginners)](https://www.mongodb.com/cloud/atlas)

---

## 📥 Installation

### Option A: If you already have the code locally

```bash
# Navigate to the project directory
cd FarmKonnect/mobile

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Option B: If you need to clone the repository

```bash
# Clone the repository
git clone https://github.com/your-repo/FarmKonnect.git

# Navigate to the project
cd FarmKonnect/mobile

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

---

## 🗄️ Set Up MongoDB

### Option A: Local MongoDB Installation

**Windows:**
```bash
# Using Chocolatey
choco install mongodb

# Or download from: https://www.mongodb.com/try/download/community
# After installation, start MongoDB
mongod
```

**macOS:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Or manually
mongod
```

**Linux (Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install -y mongodb

sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Option B: MongoDB Atlas (Cloud - Recommended)

1. Sign up at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a new project
3. Create a cluster (choose free tier)
4. Create a database user and password
5. Get connection string and add to `backend/.env`

---

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env` file with the following:

```env
# ========== SERVER ==========
PORT=5000
NODE_ENV=development
SERVER_URL=http://localhost:5000

# ========== DATABASE ==========
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/farmkonnect

# OR MongoDB Atlas (Cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/farmkonnect

# ========== JWT ==========
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_REFRESH_EXPIRE=30d

# ========== EMAIL (Gmail) ==========
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_FROM=noreply@farmkonnect.com

# ========== CLOUDINARY (Image Upload) ==========
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ========== GOOGLE OAUTH ==========
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# ========== PAYMENT (JazzCash) ==========
JAZZCASH_MERCHANT_ID=your_merchant_id
JAZZCASH_MERCHANT_PASSWORD=your_password

# ========== SESSION & SECURITY ==========
SESSION_SECRET=your_session_secret_key

# ========== CORS ==========
CORS_ORIGIN=http://localhost:19000,http://localhost:19001
```

**Getting Your Credentials:**

**Gmail App Password:**
1. Enable 2-Factor Authentication on your Gmail account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and "Windows Computer"
4. Copy the 16-character password to `EMAIL_PASSWORD`

**Cloudinary:**
1. Sign up at [cloudinary.com](https://cloudinary.com/)
2. Go to Dashboard
3. Copy Cloud Name, API Key, and API Secret

**Google OAuth:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project
3. Go to Credentials → Create OAuth 2.0 Client ID
4. Select "Web application"
5. Add `http://localhost:5000/api/auth/google/callback` to Authorized redirect URIs

### Frontend Configuration

Update `app.json` with API endpoints:

```json
{
  "expo": {
    "name": "FarmKonnect",
    "slug": "farmkonnect",
    "extra": {
      "apiUrl": "http://localhost:5000/api",
      "socketUrl": "http://localhost:5000"
    }
  }
}
```

---

## ▶️ Running the App

### Open 3 Separate Terminals

**Terminal 1: Start MongoDB**

```bash
mongod

# You should see: "waiting for connections on port 27017"
```

**Terminal 2: Start Backend Server**

```bash
cd backend
npm start

# Expected output:
# Server running on http://localhost:5000
# MongoDB connected successfully
```

**Terminal 3: Start Frontend (Expo)**

```bash
npx expo start -c

# You'll see a QR code and options
```

---

## 📱 Testing the App

After `npx expo start -c`, choose one of these options:

### Option 1: Physical Device (Recommended)
```bash
# On your phone, use:
# - Expo Go app (scan QR code)
# - Camera app (iOS 11+)
# - Expo app (iOS 17+)

# Requirements:
# - Same Wi-Fi network as your computer
# - Expo Go app installed
```

### Option 2: Android Emulator
```bash
# In the Expo terminal, press 'a'
# First load takes 2-3 minutes
```

### Option 3: iOS Simulator (macOS Only)
```bash
# In the Expo terminal, press 'i'
```

### Option 4: Web Browser
```bash
# In the Expo terminal, press 'w'
# Opens at http://localhost:19006
```

---

## ⌨️ Available Commands

```bash
# Frontend commands
npm start              # Start Expo dev server
npm start -c          # Clear cache and start
npm start -- --tunnel # Tunnel mode (remote testing)
npm install           # Install dependencies
npm audit             # Check vulnerabilities

# Backend commands (from backend directory)
npm start             # Start Express server
npm run dev           # Start with nodemon (auto-reload)
npm test              # Run tests
```

---

## 🐛 Troubleshooting

### Network Connection Issues

**"Request Timed Out" on Physical Device**

```bash
# 1. Ensure phone and computer are on the SAME Wi-Fi
# 2. Windows users: Change Wi-Fi from Public to Private
#    Settings > Network & Internet > Wi-Fi > Manage Known Networks

# 3. Try USB tunnel (Android)
adb reverse tcp:5000 tcp:5000
npx expo start

# 4. Use tunnel mode
npx expo start -- --tunnel
```

### MongoDB Connection Error

```bash
# Check if MongoDB is running
# Windows:
netstat -ano | findstr :27017

# macOS/Linux:
lsof -i :27017

# If not running:
mongod

# Or use MongoDB Atlas connection string
```

### Port Already in Use

```bash
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :5000
kill -9 <PID>

# Or change PORT in backend/.env
```

### Expo QR Code Not Scanning

```bash
# Clear Expo cache
npx expo start -c

# On device:
# 1. Close Expo Go app completely
# 2. Reopen and scan again
# 3. Check same Wi-Fi connection
```

### Dependencies Installation Failed

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules  # macOS/Linux

# Windows:
rmdir /s /q node_modules

# Reinstall
npm install
```

### Email Not Sending

- Generate [Gmail App Password](https://myaccount.google.com/apppasswords)
- Enable 2-Factor Authentication first
- Add to `backend/.env`: `EMAIL_PASSWORD=your-16-char-password`

### Image Upload Fails

- Verify Cloudinary credentials in `backend/.env`
- Check file size (< 10MB)
- Ensure CORS is configured correctly
- Test with Postman using FormData

---

## ✅ Setup Verification Checklist

Before you start developing, verify:

- [ ] Node.js & npm installed (`node --version`)
- [ ] Git installed (`git --version`)
- [ ] Expo CLI installed (`expo --version`)
- [ ] Repository cloned or code present locally
- [ ] Frontend dependencies installed (`npm list react-native`)
- [ ] Backend dependencies installed (`cd backend && npm list`)
- [ ] MongoDB running or Atlas configured
- [ ] `backend/.env` file created and configured
- [ ] `app.json` updated with API URLs
- [ ] Backend starts without errors (`npm start`)
- [ ] Frontend Expo starts (`npx expo start`)
- [ ] Can scan QR code in Expo Go
- [ ] App connects to backend (Dashboard loads data)
- [ ] Authentication works (login/signup)

---

## 📄 License

Proprietary - FarmKonnect © 2025-2026

## 🌾 Built for the Future of Agriculture

For questions or support, use the Help & Support feature in the app.


