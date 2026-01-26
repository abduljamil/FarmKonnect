# FarmKonnect – AI-Powered Agricultural Marketplace

## 1. Introduction
Agriculture plays a vital role in Pakistan's economy, yet small and medium farmers continue to face challenges such as lack of access to transparent market information, limited buyer reach, and price exploitation. The absence of a centralized, data-driven trading system leads to inefficiency and loss of farmer income.

FarmKonnect is an AI-powered agricultural marketplace designed to bridge the gap between farmers and buyers. The platform provides real-time mandi price updates, AI-based price forecasts, and secure digital payments through Easypaisa and JazzCash. FarmKonnect aims to establish a transparent, intelligent, and user-friendly digital ecosystem that empowers farmers and promotes fair trade.

## 2. Project Objectives
- Enable farmers to access real-time market prices and trends.
- Facilitate direct trading between farmers and buyers without intermediaries.
- Provide secure digital payments using Easypaisa and JazzCash integration.
- Utilize artificial intelligence to forecast short-term price movements.
- Offer a bilingual platform (Urdu and English) that is intuitive and accessible.

## 3. System Overview
FarmKonnect combines three functional layers into a single cohesive system:

**Information Layer**: Displays live mandi prices, historical data, and comparative price analysis.

**Transaction Layer**: Enables farmers to list produce, receive offers, negotiate, and complete payments securely.

**Intelligence Layer**: Integrates AI models to forecast commodity prices and send timely alerts.

## 4. Key Features

### Core Modules:
- **User Management**: Email-based registration and login with JWT authentication for farmers, traders, and administrators.
- **Market Price Dashboard**: Real-time mandi data fetched from AMIS API with easy-to-read charts.
- **AI Forecasting**: Predicts price trends for the next seven days using historical and weather data.
- **Marketplace**: Allows crop listings, buyer offers, in-app chat, and transaction history.
- **Secure Payments**: Integrates Easypaisa and JazzCash for fast, traceable payments with automatic digital receipts.
- **Alerts & Notifications**: Sends alerts for price changes, forecast updates, and buyer offers.
- **Admin Panel**: Enables admin users to manage users, monitor transactions, and analyze platform activity.

## 5. System Architecture

### Frontend:
React 19 with Vite 7, Tailwind CSS for responsive UI, React Router 7 for navigation.

### Backend:
Node.js with Express 5 providing RESTful APIs for authentication, trading, payments, and analytics.

### Database:
MongoDB for managing user accounts, listings, transactions, chats, and forecasts.

### ML Microservice:
Python with FastAPI for price forecasting, crop recommendations, disease detection, and yield estimation.

### Data Scraper:
Python-based AMIS scraper for real-time mandi price data collection and MongoDB population.

### External APIs:
- **AMIS (Pakistan Agricultural Marketing Information System)**: Real-time mandi price data
- **OpenWeather**: Weather data for forecasting
- **Easypaisa / JazzCash**: Payment processing and receipts

## 6. Workflow Summary
1. Farmer posts a crop listing with quantity, location, and price.
2. Buyer searches and makes an offer through the marketplace.
3. AI module forecasts upcoming price trends and provides insights.
4. Buyer pays via Easypaisa or JazzCash; payment receipt generated automatically.
5. Transaction data stored and used to enhance future AI forecasts.

## 7. Security Measures
- JWT-based authentication and role-based access control.
- HTTPS encryption and secured API endpoints.
- Encrypted database connections with TLS.
- Input validation and rate limiting for protection against spam or abuse.
- Audit logging for admin actions and payment records.
- Password hashing with bcrypt (salt rounds).

## 8. Expected Outcomes
- Empowerment of farmers through price transparency and fair trade access.
- Reduction in fraudulent or delayed transactions through secure digital payments.
- Reliable short-term price forecasts to support better market decisions.
- Enhanced transparency and data-driven insights in agricultural trade.

## 9. Tools & Technologies

| Category | Technology |
|----------|------------|
| Frontend | React 19, Vite 7, Tailwind CSS 3, React Router 7 |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Mongoose ODM) |
| ML Service | Python, FastAPI, scikit-learn, TensorFlow |
| Data Scraper | Python, BeautifulSoup, Requests, PyMongo |
| Authentication | JWT, bcrypt |
| Payments | Easypaisa / JazzCash APIs |
| External Data | AMIS, OpenWeather API |

---

## Authentication System

### Features
- ✅ User registration (Sign Up) with role selection
- ✅ User login (Sign In) with JWT tokens
- ✅ Password hashing with bcrypt
- ✅ Role-based access (Buyer/Seller/Admin)
- ✅ Protected routes with authentication middleware
- ✅ Token-based session management

### Setup Instructions

#### Prerequisites
- Node.js 18+ installed
- MongoDB running on `localhost:27017`
- Python 3.11+ for ML service

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm run dev
```

Backend runs on `http://localhost:3000`

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend runs on `http://localhost:5173` (or next available port)

#### ML Service Setup

1. Navigate to ml_service directory:
```bash
cd ml_service
```

2. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # On Windows
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the ML service:
```bash
python app.py
```

ML service runs on `http://localhost:5000`
- Interactive API docs: `http://localhost:5000/docs`

#### Data Scraper Setup

1. Navigate to scrapper directory:
```bash
cd scrapper
```

2. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the AMIS scraper:
```bash
python amis_scraper.py
```

### API Endpoints

#### Authentication Routes

**POST** `/api/auth/signup` - Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "buyer"
}
```

**POST** `/api/auth/signin` - Login existing user
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**GET** `/api/auth/me` - Get current user (Protected)
- Headers: `Authorization: Bearer <token>`

#### ML Service Routes (Protected)

**POST** `/api/ml/crop-recommendation` - Get crop recommendations
```json
{
  "nitrogen": 90,
  "phosphorus": 42,
  "potassium": 43,
  "temperature": 20.5,
  "humidity": 82,
  "ph": 6.5,
  "rainfall": 202.9
}
```

**POST** `/api/ml/price-forecast` - Forecast crop prices
```json
{
  "crop_name": "Rice",
  "quantity": 100,
  "location": "Punjab",
  "season": "Kharif"
}
```

**POST** `/api/ml/disease-detection` - Detect plant diseases
```json
{
  "image": "base64_encoded_image",
  "crop_type": "tomato"
}
```

**POST** `/api/ml/yield-estimation` - Estimate crop yield
```json
{
  "crop_name": "Wheat",
  "area": 5.0,
  "soil_quality": "high",
  "irrigation": true,
  "fertilizer_used": true
}
```

### Frontend Routes
- `/` - Home page (protected, requires authentication)
- `/signin` - Sign in page
- `/signup` - Sign up page

### User Roles
- **Buyer**: Default role for regular users purchasing agricultural products
- **Seller**: For farmers/sellers listing products
- **Admin**: For platform administrators (future implementation)

### Project Structure

```
FarmKonnect/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   └── mlController.js       # ML service integration
│   ├── dal/
│   │   ├── base.js              # Base repository
│   │   ├── index.js
│   │   └── repositories/
│   │       └── users.js         # User repository
│   ├── middleware/
│   │   └── auth.js              # JWT verification
│   ├── models/
│   │   └── User.js              # User schema
│   ├── routes/
│   │   ├── auth.js              # Auth routes
│   │   └── ml.js                # ML routes
│   ├── services/
│   │   ├── authService.js       # Auth business logic
│   │   └── mlService.js         # ML service client
│   ├── index.js                 # Express app
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Card.jsx
│   │   │   └── ErrorMessage.jsx
│   │   ├── pages/
│   │   │   ├── SignIn.jsx       # Login page
│   │   │   ├── SignUp.jsx       # Registration page
│   │   │   └── Home.jsx         # Dashboard
│   │   ├── App.jsx              # Router setup
│   │   ├── main.jsx
│   │   └── index.css            # Tailwind directives
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── ml_service/
│   ├── models/                  # Trained ML models
│   ├── app.py                   # FastAPI application
│   ├── requirements.txt
│   └── README.md
│
├── scrapper/
│   ├── amis_scraper.py         # AMIS data scraper
│   ├── advanced_scraper.py     # Scheduled scraper
│   ├── config.py               # Scraper configuration
│   ├── requirements.txt
│   └── README.md
│
└── README.md
```

### Testing the Application

#### Test Sign Up Flow:
1. Open `http://localhost:5173/signup`
2. Fill in the form (Name, Email, Role, Password)
3. Click "Sign Up" → Redirected to home page

#### Test Sign In Flow:
1. Open `http://localhost:5173/signin`
2. Enter credentials
3. Click "Sign In" → Redirected to home page

#### Test ML Predictions:
1. Ensure ML service is running
2. Login to get JWT token
3. Use token to call `/api/ml/*` endpoints

### Security Notes

⚠️ **Important for Production:**
1. Move JWT_SECRET to environment variables
2. Use HTTPS in production
3. Implement rate limiting on auth endpoints
4. Add CSRF protection
5. Implement refresh token mechanism
6. Add email verification
7. Add password reset functionality
8. Use secure HTTP-only cookies for tokens

### Next Steps
- [ ] Add password reset functionality
- [ ] Add email verification
- [ ] Implement refresh tokens
- [ ] Add OAuth (Google, Facebook)
- [ ] Add 2FA authentication
- [ ] Complete payment gateway integration
- [ ] Train and deploy actual ML models
- [ ] Set up production environment
- [ ] Add automated testing
- [ ] Implement CI/CD pipeline

### Troubleshooting

**MongoDB Connection Issues**
- Ensure MongoDB is running: Check MongoDB service
- Check connection string in `backend/config/db.js`

**CORS Issues**
- Backend CORS is configured for ports 5173, 5174, 5175
- Update `backend/index.js` if frontend runs on different port

**Port Already in Use**
- Backend: Change port in `backend/index.js`
- Frontend: Vite will automatically try next available port
- ML Service: Set PORT environment variable

## Summary
FarmKonnect aims to revolutionize agricultural trading in Pakistan by integrating data intelligence, secure payments, and digital connectivity into a single bilingual platform. The system's modular architecture with microservices ensures scalability, security, and accessibility, paving the way toward a fair and transparent agricultural economy.

## License
ISC
