# 🌾 FarmKonnect - Mobile App

**Empowering Agriculture Digitally.**

FarmKonnect is a modern mobile application built with React Native and Expo. It serves as a digital marketplace and real-time communication platform designed to connect farmers, buyers, and agricultural stakeholders seamlessly.

---

## ✨ Features

- **🛍️ Marketplace:** Browse, filter, and discover agricultural listings and commodities with an intuitive animated UI.
- **💬 Real-Time Chat:** Integrated Socket.io messaging allows direct, instant communication between buyers and sellers.
- **🌤️ Live Dashboard:** Get real-time weather updates (via device location) and live commodity price tickers.
- **🔔 Price Alerts:** Set thresholds for commodity prices and receive notifications when market conditions change.
- **💳 Secure Transactions:** Track orders and securely checkout directly from the marketplace.
- **🎨 Modern UI/UX:** Features a hardware-accelerated 3D-style animated background that runs smoothly without compromising performance.

---

## 🛠️ Tech Stack

### Frontend (Mobile)
- **Framework:** React Native via [Expo](https://expo.dev/)
- **Navigation:** React Navigation
- **Styling:** Native StyleSheet & Tailwind (Nativewind)
- **Animations:** React Native Animated API (`useNativeDriver`)
- **Real-time:** `socket.io-client`
- **Location:** `expo-location`

### Backend (Reference)
- **Server:** Node.js, Express.js
- **Database:** MongoDB
- **Real-time:** Socket.io
- **Storage:** Cloudinary

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and the [Expo CLI](https://expo.dev/) installed.

### Installation

1. **Clone the repository** (or navigate to the workspace directory):
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Ensure your `.env` file or backend endpoints in `src/services/api.js` are pointing to your local or deployed Express backend.

4. **Run the app:**
   ```bash
   npx expo start -c
   ```

5. **Test the app:**
   - Scan the generated QR code using the **Expo Go** app on your physical device.
   - Or press `a` to open in an Android Emulator.
   - Or press `i` to open in an iOS Simulator.

---

## 📱 Troubleshooting Network Connections

If you face a "Request Timed Out" issue while testing on a physical device:
- Ensure your Phone and PC are on the **exact same Wi-Fi network**.
- Windows Users: Set your Wi-Fi network profile from *Public* to **Private**.
- Alternative: Plug your phone into your PC via a USB cable and run the server.

---

*Built for the future of agriculture.* 🚜