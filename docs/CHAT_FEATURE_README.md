# Real-Time Chat & Negotiation Feature

## Overview

This feature enables real-time communication between buyers and sellers, similar to OLX. Buyers can message sellers about products and make offers that can be accepted or rejected.

## Features

### 1. **Real-Time Messaging**

- Instant message delivery using Socket.io
- Typing indicators
- Read receipts
- Message history

### 2. **Product-Based Conversations**

- Each conversation is tied to a specific product listing
- View product details within the chat interface
- Conversations automatically created when buyer contacts seller

### 3. **Offer System**

- Buyers can make price offers
- Sellers can accept, reject, or counter offers
- Offer status tracking (pending, accepted, rejected, countered)
- Visual differentiation for offer messages

### 4. **User Roles**

- **Buyers**: Browse products, initiate chats, make offers
- **Sellers**: Receive inquiries, respond to offers, manage listings

## Backend Structure

### Models

#### Product Model (`/backend/models/Product.js`)

- Product listings with title, description, price, category
- Image support
- Location and quantity tracking
- Status management (active, sold, inactive)

#### Conversation Model (`/backend/models/Conversation.js`)

- Links buyer, seller, and product
- Tracks last message and timestamp
- Unique constraint per product-buyer-seller combination

#### Message Model (`/backend/models/Message.js`)

- Supports text messages and offer messages
- Tracks read status
- Stores offer amount and status for negotiation

### API Endpoints

#### Chat Routes (`/api/chat/`)

- `POST /conversations` - Create or get conversation
- `GET /conversations` - Get user's conversations
- `GET /conversations/:id/messages` - Get conversation messages
- `POST /messages` - Send message (HTTP fallback)
- `PUT /conversations/:id/read` - Mark messages as read
- `PUT /messages/:id/offer` - Update offer status
- `GET /unread-count` - Get unread message count

#### Product Routes (`/api/products/`)

- `GET /` - Get all products (with filters)
- `GET /:id` - Get product by ID
- `POST /` - Create product (auth required)
- `GET /my/products` - Get seller's products (auth required)
- `PUT /:id` - Update product (auth required)
- `DELETE /:id` - Delete product (auth required)

### Socket.io Events

#### Client → Server

- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `send_message` - Send a message
- `typing` - Send typing indicator
- `stop_typing` - Stop typing indicator
- `mark_read` - Mark messages as read
- `update_offer` - Update offer status

#### Server → Client

- `connected` - Connection confirmation
- `new_message` - New message received
- `user_typing` - Another user is typing
- `user_stop_typing` - User stopped typing
- `offer_updated` - Offer status changed
- `messages_read` - Messages marked as read
- `error` - Error occurred

## Frontend Structure

### Pages

#### Chat Page (`/frontend/src/pages/Chat.jsx`)

- Split-screen layout
- Conversations list on left
- Active chat on right
- Real-time message updates
- Typing indicators

#### Products Page (`/frontend/src/pages/Products.jsx`)

- Product browsing with filters
- Category, price range, and search filters
- "Contact Seller" button initiates chat
- Product cards with images and details

### Components

#### ConversationItem (`/components/ConversationItem.jsx`)

- Displays conversation preview
- Shows product thumbnail
- Last message preview
- Timestamp

#### MessageBubble (`/components/MessageBubble.jsx`)

- Regular text messages
- Offer messages with accept/reject buttons
- Read receipts
- Timestamp formatting

#### MessageInput (`/components/MessageInput.jsx`)

- Text message input
- "Make Offer" button
- Offer amount input form
- Send functionality

### Utils

#### Socket Service (`/utils/socket.js`)

- Socket.io connection management
- Event emission and listening
- Reconnection handling
- Singleton pattern

#### Chat API (`/utils/chatApi.js`)

- HTTP API calls for chat functionality
- Authentication token handling
- Error handling

## Installation & Setup

### Backend

```bash
cd backend
npm install socket.io
npm run dev
```

### Frontend

```bash
cd frontend
npm install socket.io-client
npm run dev
```

## Environment Variables

### Backend

```
JWT_SECRET=your-secret-key-here
```

## Database Collections

### conversations

- product (ObjectId → products)
- buyer (ObjectId → users)
- seller (ObjectId → users)
- lastMessage (String)
- lastMessageAt (Date)
- createdAt (Date)

### messages

- conversation (ObjectId → conversations)
- sender (ObjectId → users)
- messageType ('text' | 'offer' | 'system')
- content (String)
- offerAmount (Number, optional)
- offerStatus ('pending' | 'accepted' | 'rejected' | 'countered')
- read (Boolean)
- createdAt (Date)

### products

- title (String)
- description (String)
- price (Number)
- category (String)
- images (Array of Strings)
- seller (ObjectId → users)
- location (String)
- status ('active' | 'sold' | 'inactive')
- quantity (Number)
- unit (String)
- createdAt (Date)
- updatedAt (Date)

## Usage Flow

1. **Seller Posts Product**

   - Creates listing with details, price, images
   - Product appears in marketplace

2. **Buyer Browses Products**

   - Filters by category, price, location
   - Views product details

3. **Buyer Initiates Chat**

   - Clicks "Contact Seller"
   - Conversation automatically created
   - Redirected to chat interface

4. **Real-Time Communication**

   - Exchange messages instantly
   - See typing indicators
   - View read receipts

5. **Make Offer**

   - Buyer clicks "Make Offer"
   - Enters offer amount
   - Seller receives offer notification

6. **Respond to Offer**
   - Seller can accept or reject
   - Status updates in real-time
   - Both parties notified

## Security Features

- JWT authentication for all protected routes
- Socket.io authentication middleware
- User authorization checks
- Seller verification for product operations

## Future Enhancements

- Image/file sharing in chat
- Voice messages
- Video calls
- Group chats for multiple buyers
- Push notifications
- Email notifications
- Chat search functionality
- Message reactions
- Archived conversations
- Block/report users
