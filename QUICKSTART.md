# Quick Start Guide - FarmKonnect

## Prerequisites
- Node.js 18+ installed
- Python 3.11+ installed
- MongoDB running locally

## 1. Backend Setup (Node.js/Express)
```bash
cd backend
npm install
npm run dev
```
✅ Backend running on http://localhost:3000

## 2. Frontend Setup (React/Vite)
```bash
cd frontend
npm install
npm run dev
```
✅ Frontend running on http://localhost:5173

## 3. ML Service Setup (FastAPI)
```bash
cd ml_service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
✅ ML Service running on http://localhost:5000
📚 API Docs: http://localhost:5000/docs

## 4. Data Scraper (Optional)
```bash
cd scrapper
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python amis_scraper.py
```
✅ Scraper populates MongoDB with AMIS market data

## Environment Variables (Optional)
Create `.env` files in respective directories:

**backend/.env**
```
MONGODB_URI=mongodb://localhost:27017/FarmKonnect
JWT_SECRET=your_secret_key_here
ML_SERVICE_URL=http://localhost:5000
PORT=3000
```

**ml_service/.env**
```
PORT=5000
```

## Test the System
1. Start all services (backend, frontend, ml_service)
2. Open http://localhost:5173
3. Sign up with email/password
4. Login and access protected home page
5. ML endpoints available at http://localhost:3000/api/ml/*

## Architecture Overview
```
FarmKonnect/
├── backend/         → Node.js + Express (Port 3000)
├── frontend/        → React + Vite + Tailwind (Port 5173)
├── ml_service/      → FastAPI ML APIs (Port 5000)
└── scrapper/        → AMIS Data Scraper (Python)
```

## Common Issues
- **Port in use**: Kill process or change port in respective config
- **MongoDB not running**: Start MongoDB service
- **CORS errors**: Check backend CORS config includes your frontend port
