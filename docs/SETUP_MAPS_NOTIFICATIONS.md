# Quick Setup Guide - Maps & Order Notifications

## Prerequisites
- Google Maps API Key
- Browser with notification support

## Setup Steps

### 1. Get Google Maps API Key (5 minutes)
1. Visit https://console.cloud.google.com/
2. Create/select project
3. Enable APIs:
   - Maps JavaScript API ✓
   - Places API ✓
4. Go to "Credentials" → Create API Key
5. Copy the API key

### 2. Configure Frontend (.env file)
```bash
cd frontend
cp .env.example .env
# Edit .env and add your API key:
VITE_GOOGLE_MAPS_API_KEY=your_actual_key_here
```

### 3. Restart Development Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 4. Test Features

#### Test Maps Integration:
1. Login as buyer
2. Go to any listing
3. Click "Buy Now"
4. Scroll to "Pin Delivery Location"
5. Try:
   - Drag marker
   - Click on map
   - "Use My Location" button
6. Verify address appears below map

#### Test Order Notifications:
1. Login as seller in one browser/tab
2. Login as buyer in another browser/tab (incognito mode)
3. Buyer places order on seller's listing
4. Seller should see:
   - Browser notification (if permitted)
   - Green badge on 📦 icon in navbar
   - Order details in dropdown

## Important Notes

### API Key Security
- Never commit `.env` to git (already ignored)
- Add domain restrictions in Google Cloud Console
- Monitor API usage to stay within free tier

### Browser Notifications
- First time: Browser asks for permission
- User can allow/deny/block
- Only works when user is logged in
- Desktop & mobile browsers supported

### Socket.io Connection
- Backend must be running
- Frontend must connect to correct backend URL
- Check browser console for "Socket connected" message

## Verification Checklist
- [ ] `.env` file created with API key
- [ ] Development server restarted
- [ ] Map loads in CreateTransaction page
- [ ] Can place marker on map
- [ ] Address shows below map
- [ ] Browser notification permission requested
- [ ] Order notifications appear for seller
- [ ] Badge count increases with new orders
- [ ] Clicking notification goes to transactions page

## Troubleshooting

### Map shows gray box
→ API key missing or invalid in `.env`
→ Maps JavaScript API not enabled

### "Use My Location" doesn't work
→ Location permission denied in browser
→ Need HTTPS in production (HTTP OK on localhost)

### No order notifications
→ Socket.io not connected (check console)
→ Seller not logged in
→ Browser notification permission denied

### Badge count not updating
→ Hard refresh page (Ctrl+Shift+R)
→ Check socket event in Network tab

## Next Steps
After verification, check [MAPS_AND_NOTIFICATIONS.md](./MAPS_AND_NOTIFICATIONS.md) for:
- Detailed technical documentation
- API payload structures
- Component props
- Future enhancements
- Production deployment guide

## Support
If issues persist:
1. Check browser console for errors
2. Verify backend is running
3. Check socket connection status
4. Review [MAPS_AND_NOTIFICATIONS.md](./MAPS_AND_NOTIFICATIONS.md)
