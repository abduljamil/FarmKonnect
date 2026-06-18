# FarmKonnect Web Platform

This is the React/Vite web frontend for the FarmKonnect application. It serves as the primary dashboard for users to access the B2B marketplace, real-time chat, and the Machine Learning price forecasting charts.

## Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **Data Visualization:** Recharts
- **Icons:** Lucide React

## Getting Started

1. Ensure the Node.js backend is running.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Key Features
- **Price Trends Chart (`src/pages/PriceTrends.jsx`)**: Renders the exact historical W-FRI prices alongside LightGBM forecasts with Expected MAPE confidence bands.
- **Marketplace (`src/pages/Marketplace.jsx`)**: Filterable crop listings with location-based proximity sorting.
- **Kisan AI Widget (`src/components/KisanFloatingWidget.jsx`)**: Persistent context-aware chat widget powered by Google Gemini, supporting English and Urdu.

## Full Documentation
For complete architectural details, please see the `docs/` folder in the root directory.
