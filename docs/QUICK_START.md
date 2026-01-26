# Quick Start Guide - Real-Time Chat Feature

## Prerequisites

- Node.js installed
- MongoDB running on localhost:27017
- Terminal access

## Step-by-Step Setup

### 1. Start MongoDB

```bash
# Make sure MongoDB is running
mongosh
# Or start MongoDB service
sudo systemctl start mongodb
```

### 2. Setup Backend

```bash
# Navigate to backend directory
cd /home/ahtsham/Coding/FYP/code/backend

# Install dependencies (if not already installed)
npm install

# Seed the database with sample data
node seed.js

# Start the backend server
npm run dev
```

The backend should now be running on `http://localhost:3000`

### 3. Setup Frontend

Open a new terminal:

```bash
# Navigate to frontend directory
cd /home/ahtsham/Coding/FYP/code/frontend

# Install dependencies (if not already installed)
npm install

# Start the frontend development server
npm run dev
```

The frontend should now be running on `http://localhost:5173`

## Testing the Feature

### Step 1: Create Test Users (or use seeded users)

**Option A: Use Seeded Users**

- Seller: `seller@example.com` / `password123`
- Buyer: `buyer@example.com` / `password123`

**Option B: Create New Users**

1. Go to `http://localhost:5173/signup`
2. Create a seller account
3. Create a buyer account (use different email)

### Step 2: Test the Flow

#### As a Seller:

1. Sign in with seller account
2. Navigate to Products page
3. You'll see "Your Product" label on products you own

#### As a Buyer:

1. Sign in with buyer account
2. Navigate to `/products`
3. Browse available products
4. Click "Contact Seller" on any product
5. You'll be redirected to the chat page

### Step 3: Test Real-Time Chat

1. **Open two browser windows/tabs**:

   - Window 1: Signed in as buyer
   - Window 2: Signed in as seller

2. **In Buyer's window**:

   - Navigate to Products
   - Click "Contact Seller" on a product
   - Send a message: "Hi, is this still available?"

3. **In Seller's window**:

   - Navigate to `/chat`
   - You should see the new conversation appear
   - Click on it to open
   - You'll see the buyer's message in real-time
   - Reply: "Yes, it is! What quantity do you need?"

4. **Test Offer Feature**:
   - In Buyer's window, click "Make Offer"
   - Enter an amount (e.g., 4500 if original price is 5000)
   - Click "Send Offer"
5. **Accept/Reject Offer**:
   - In Seller's window, you'll see the offer appear
   - Click "Accept" or "Reject"
   - Status updates in real-time for both users

## Features to Test

✅ **Real-time messaging**

- Messages appear instantly in both windows
- No page refresh needed

✅ **Typing indicators**

- Type a message and watch the other side
- "User typing..." should appear

✅ **Read receipts**

- Send a message and watch for double check marks
- Marks appear when other user views the message

✅ **Offer system**

- Make offers on products
- Accept/reject offers
- See status changes in real-time

✅ **Conversation list**

- Shows all your conversations
- Latest message preview
- Product thumbnail and details

✅ **Multiple conversations**

- Create conversations with different products
- Switch between conversations
- Each maintains its own message history

## Common Issues & Solutions

### Issue: "Authentication error: No token provided"

**Solution**: Make sure you're signed in. Socket.io requires authentication.

### Issue: Messages not appearing in real-time

**Solution**:

1. Check if backend is running
2. Check browser console for Socket.io connection errors
3. Make sure both users are in the same conversation

### Issue: "Cannot read property '\_id' of null"

**Solution**: Make sure you've seeded the database with products

### Issue: Socket.io CORS errors

**Solution**: The backend is configured for ports 5173, 5174, 5175. If your frontend runs on a different port, update `backend/config/socket.js` and `backend/index.js`

## API Testing with Postman/Thunder Client

### 1. Sign In

```
POST http://localhost:3000/api/auth/signin
Content-Type: application/json

{
  "email": "buyer@example.com",
  "password": "password123"
}
```

Save the returned token.

### 2. Get Products

```
GET http://localhost:3000/api/products
```

### 3. Create Conversation

```
POST http://localhost:3000/api/chat/conversations
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "productId": "<product_id_from_step_2>",
  "sellerId": "<seller_id_from_product>"
}
```

### 4. Get Conversations

```
GET http://localhost:3000/api/chat/conversations
Authorization: Bearer <your_token>
```

### 5. Get Messages

```
GET http://localhost:3000/api/chat/conversations/<conversation_id>/messages
Authorization: Bearer <your_token>
```

## Monitoring

### Backend Logs

Watch the backend terminal for:

- Socket.io connections: `User connected: <name>`
- Room joins: `User <name> joined conversation <id>`
- Messages: Logged as they're sent

### Frontend Console

Open browser DevTools (F12) → Console to see:

- Socket connection status
- Real-time events
- Any errors

## Next Steps

Once the basic feature is working, you can:

1. Add file/image sharing in chat
2. Implement push notifications
3. Add voice/video call feature
4. Create admin panel for moderation
5. Add message search functionality
6. Implement message reactions

## Need Help?

Check the main documentation: `CHAT_FEATURE_README.md`
