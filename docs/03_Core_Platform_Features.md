# 3. Core Platform Features

This document details the primary features of the FarmKonnect web and mobile applications, excluding the machine learning forecasting (covered in Section 5).

## 3.1 Authentication & Authorization

FarmKonnect uses JSON Web Tokens (JWT) for stateless, secure authentication across both web and mobile clients.

### Features:
- **Registration**: Users sign up with an email and password. Passwords are securely hashed using `bcryptjs` before being stored in MongoDB.
- **Email Verification**: Upon registration, an OTP is generated and sent via NodeMailer. Users cannot list products or initiate transactions until their email is verified.
- **Password Reset**: Secure forgot-password flow generating a time-limited token.
- **Authorization**: Protected routes use an `auth` middleware that verifies the JWT from the `Authorization: Bearer <token>` header.
- **Optional Auth**: For public features like the Kisan AI widget, an `optionalAuth` middleware is used to attach the user profile if they are logged in, but allows guest access if they are not.

## 3.2 B2B E-Commerce Marketplace

The marketplace is the core transactional hub connecting farmers directly to buyers.

### 3.2.1 Listings Management
- **Create/Edit**: Farmers can post listings specifying the commodity, variety, price per unit (e.g., Rs/40Kg), and available quantity.
- **Media Uploads**: Images are uploaded from the client, handled by `multer` on the backend, and securely stored in **Cloudinary**, generating optimized URLs.
- **Geospatial Queries**: Listings are tagged with the seller's location. The backend supports querying listings by distance, sorting nearest-first based on the buyer's GPS coordinates.

### 3.2.2 Filtering & Search
- Robust backend APIs (`/api/listings`) allow filtering by `category`, `commodity`, `minPrice`, `maxPrice`, and `status`.

## 3.3 Kisan AI (Generative AI Assistant)

Kisan AI is a virtual farming assistant powered by Google's Gemini 1.5 Flash model. It is available as a floating widget globally and as a dedicated fullscreen page.

### 3.3.1 Architecture
- **API**: Frontend calls `/api/ai/chat/start` and `/api/ai/chat/message`.
- **System Prompt**: The backend dynamically injects a strict system instruction ("You are Kisan, an expert farming assistant in Pakistan...").
- **Multilingual Support**: The frontend tracks the user's selected language (English or Urdu) via React Context and passes it to the backend. The Gemini API is instructed to reply strictly in the requested language.
- **Context Persistence**: Chat history is maintained in the MongoDB `aiconversations` collection. For guest users, a `conversationId` is temporarily persisted in browser `sessionStorage`.

## 3.4 Price Trends Dashboard

The dashboard bridges the gap between historical government data and the machine learning predictions.

- **Interactive Charts**: Built using `recharts` on the web. Features include zoom, pan, and dynamic timeline selection (1M, 3M, 1Y, All).
- **Dual Overlays**: Renders the exact historical W-FRI prices (solid green line) and overlays the LightGBM forecast points (dashed orange line).
- **Confidence Bands**: Renders the 10th-90th percentile bounds (for Sugar) or the Expected MAPE bounds (for Wheat) as a shaded SVG area beneath the forecast line.

## 3.5 Price Alerts & Notifications

- Users can subscribe to specific `(commodity, city)` pairs with a threshold price.
- When the daily scraper ingests a new price that crosses the threshold, the backend generates an alert.
- **Delivery**: Alerts are delivered via WebSockets for active users and via Expo Push Notifications to mobile devices.

## 3.6 Admin Panel & Ticketing

A comprehensive backend tool for system administrators.
- **Dashboard**: Aggregates system metrics (Total Users, Active Listings, Transaction Volume).
- **Support System**: Users can open tickets. Admins can reply to and close tickets through the `/api/support` routes.
- **User Management**: Admins can suspend users or delete fraudulent listings.
