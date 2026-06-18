# 🌾 FarmKonnect: Digital Agriculture & ML Price Forecasting

**Empowering Agriculture Digitally.**

FarmKonnect is a comprehensive, production-ready agricultural technology platform. It serves as a digital B2B marketplace, a real-time communication hub, and a sophisticated machine learning forecasting engine designed to connect farmers, buyers, and agricultural stakeholders seamlessly.

---

## 📚 Final Year Project (FYP) Documentation

This repository contains extensive, professional-grade technical documentation detailing every facet of the FarmKonnect system. Please refer to the `docs/` directory for in-depth diagrams, schemas, and architectural breakdowns.

### 1. [System Architecture & Tech Stack](docs/01_System_Architecture_and_Tech_Stack.md)
Discover the high-level Dockerized architecture, EC2 deployment strategy, and the specific technologies powering the Frontend, Backend, Mobile, and Machine Learning layers.

### 2. [Database Design & Schema (ERD)](docs/02_Database_Design.md)
Explore the MongoDB Atlas NoSQL schema, including the Entity Relationship Diagram linking Users, Transactions, AMIS Prices, and ML Predictions.

### 3. [Core Platform Features](docs/03_Core_Platform_Features.md)
Detailed breakdowns of JWT Authentication, the B2B Marketplace, Admin controls, and the Gemini-powered Multilingual Kisan AI Assistant.

### 4. [Transactions & Real-Time Chat](docs/04_Transactions_And_Chat.md)
Sequence diagrams illustrating the exact lifecycle of an e-commerce order and the Socket.io real-time chat architecture.

### 5. [Machine Learning Pipeline](docs/05_Machine_Learning_Pipeline.md)
A deep dive into the crown jewel of FarmKonnect: the LightGBM price forecasting engine. Covers AMIS scraping, Weather/WorldBank feature engineering, the dynamic Model Router, and live MAPE drift monitoring.

### 6. [Mobile App & CI/CD Deployment](docs/06_Mobile_And_Deployment.md)
Learn how the React Native Expo app is distributed via Over-The-Air (OTA) updates and how the GitHub Actions pipeline automates EC2 deployments.

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/), [Docker](https://www.docker.com/), and the [Expo CLI](https://expo.dev/) installed.

### 1. Running the Web Platform (Docker)
The easiest way to spin up the entire backend, frontend, scraper, and prediction service is via `docker-compose`:
```bash
docker-compose up -d --build
```
The web app will be available at `http://localhost`.

### 2. Running the Mobile App Locally
```bash
cd mobile
npm install
npx expo start -c
```
Scan the generated QR code using the **Expo Go** app on your physical iOS or Android device.

---

*Built for the future of agriculture.* 🚜