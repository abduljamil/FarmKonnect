# Maps Integration & Order Notifications

## Overview
This document describes the implementation of delivery location mapping and real-time seller notifications for new orders.

## Features Implemented

### 1. Google Maps Integration for Delivery Location
- **Component**: `MapLocationPicker.jsx`
- **Location**: `frontend/src/components/MapLocationPicker.jsx`
- **Features**:
  - Interactive Google Maps with draggable marker
  - Click-to-place location on map
  - "Use My Location" button with geolocation
  - Reverse geocoding to display formatted address
  - Real-time coordinates display (latitude, longitude)
  - Dark mode support
  - Fallback to Islamabad coordinates (33.6844, 73.0479)

### 2. Transaction Model Update
- **File**: `backend/models/Transaction.js`
- **Changes**:
  ```javascript
  deliveryLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
  }
  ```
- Stores coordinates and formatted address from map picker

### 3. Order Creation with Location
- **File**: `frontend/src/pages/CreateTransaction.jsx`
- **Integration**:
  - MapLocationPicker component added between phone and delivery notes
  - `deliveryLocation` state added to formData
  - Location passed to transaction creation API
  - Optional feature (not required to place order)
  - Shows pinned location confirmation message

### 4. Real-Time Seller Notifications
- **Backend**: `backend/controllers/paymentController.js`
- **Socket Event**: `newOrder`
- **Emitted Data**:
  ```javascript
  {
    transactionId: string,
    listingTitle: string,
    buyerName: string,
    amount: number,
    quantity: number,
    orderStatus: string,
    createdAt: Date
  }
  ```
- Notification sent to seller's socket room: `user_${sellerId}`

### 5. Navbar Order Notifications
- **File**: `frontend/src/components/Navbar.jsx`
- **Features**:
  - Order notification bell icon with badge count
  - Dropdown showing latest 10 orders
  - Browser notifications (with permission)
  - Real-time updates via Socket.io
  - "Clear all" functionality
  - Auto-navigate to transactions page on click
  - Green badge for new orders
  - Animated pulse effect on badge

## Setup Instructions

### 1. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
4. Create API credentials (API Key)
5. Add API key restrictions (optional but recommended):
   - HTTP referrers: `http://localhost:*`, `your-production-domain.com`
   - API restrictions: Maps JavaScript API, Places API

### 2. Configure Environment Variables
1. Copy `.env.example` to `.env` in the frontend folder:
   ```bash
   cd frontend
   cp .env.example .env
   ```
2. Add your Google Maps API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

### 3. Enable Browser Notifications
- Browser will automatically request notification permission when user logs in
- Users can allow/deny in browser settings
- Works on most modern browsers (Chrome, Firefox, Edge, Safari)

## Usage

### For Buyers
1. Navigate to a listing and click "Buy Now"
2. Fill in delivery details
3. Optionally pin delivery location on map:
   - Drag marker to exact location
   - Click anywhere on map to place marker
   - Use "Use My Location" button for current location
4. Complete purchase

### For Sellers
1. When a buyer places an order:
   - Bell icon shows green badge with order count
   - Browser notification appears (if enabled)
2. Click bell icon to see order details
3. Click on order to view full transaction details
4. Click "View all orders" to go to transactions page

## Technical Details

### Socket.io Events
- **Event Name**: `newOrder`
- **Room**: `user_${sellerId}`
- **Payload**: Transaction details with buyer info

### Component Props
```javascript
// MapLocationPicker
<MapLocationPicker
  onLocationSelect={(location) => {
    // location = { latitude, longitude, address }
  }}
/>

// Navbar
<Navbar
  user={user}
  onLogout={handleLogout}
  unreadCount={messageCount}
/>
```

### API Changes
```javascript
// POST /api/payments/transactions
{
  listingId: string,
  amount: number,
  quantity: number,
  paymentMethod: "cod" | "jazzcash",
  deliveryAddress: string,
  deliveryNotes: string,
  buyerPhone: string,
  deliveryLocation: {  // NEW
    latitude: number,
    longitude: number,
    address: string
  }
}
```

## Notification Flow
1. Buyer creates transaction
2. Backend saves transaction with deliveryLocation
3. Backend emits `newOrder` socket event to seller
4. Seller's browser receives event
5. Notification badge updates
6. Browser notification shows (if permitted)
7. Order appears in notification dropdown

## Browser Compatibility
- Maps: All modern browsers with JavaScript enabled
- Geolocation: Requires HTTPS in production (HTTP works on localhost)
- Notifications: Chrome, Firefox, Edge, Safari (desktop & mobile)

## Security Considerations
1. API key should be restricted to your domain
2. Never commit `.env` file to git (already in .gitignore)
3. Use environment variables in production deployment
4. Socket events are sent only to seller's private room
5. Transaction creation requires authentication

## Future Enhancements
- [ ] Show delivery location on transaction details page
- [ ] Add route/distance calculation from seller to buyer
- [ ] Estimate delivery time based on distance
- [ ] Add delivery tracking with live location
- [ ] Send order confirmation email with map link
- [ ] Allow seller to view buyer's location on map
- [ ] Add multiple delivery addresses for buyer
- [ ] Integration with delivery services APIs

## Troubleshooting

### Map not loading
- Check API key is correct in `.env`
- Verify Maps JavaScript API is enabled
- Check browser console for errors
- Ensure Places API is enabled for reverse geocoding

### Notifications not working
- Check browser notification permission
- Verify Socket.io connection is established
- Check socket room name matches seller ID
- Ensure backend emits event correctly

### Location not accurate
- Enable location services in browser
- Allow location permission for the site
- Check if HTTPS is enabled (required for geolocation in production)

## Related Files
- `frontend/src/components/MapLocationPicker.jsx` - Map component
- `frontend/src/pages/CreateTransaction.jsx` - Order creation form
- `frontend/src/components/Navbar.jsx` - Order notifications
- `backend/models/Transaction.js` - Transaction schema
- `backend/controllers/paymentController.js` - Order creation logic
- `frontend/.env` - Environment variables (not committed)
- `frontend/.env.example` - Environment variables template
