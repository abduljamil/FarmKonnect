# FarmKonnect Chat Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Products    │  │    Chat      │  │   SignIn/Up  │          │
│  │    Page      │  │    Page      │  │     Pages    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│  ┌──────▼──────────────────▼──────────────────▼───────┐         │
│  │              Components Layer                       │         │
│  │  • ConversationItem  • MessageBubble               │         │
│  │  • MessageInput      • Button, Card, Input         │         │
│  └──────┬─────────────────────────────────────────────┘         │
│         │                                                         │
│  ┌──────▼─────────────────────────────────┐                     │
│  │          Utils & Services               │                     │
│  │  • socket.js (Socket.io Client)        │                     │
│  │  • chatApi.js (HTTP API calls)         │                     │
│  └──────┬─────────────────────────────────┘                     │
└─────────┼─────────────────────────────────────────────────────┘
          │
          │ HTTP Requests & WebSocket Connection
          │
┌─────────▼─────────────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                 │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   Socket.io Server                        │ │
│  │  • Authentication Middleware                              │ │
│  │  • Room Management (conversations)                        │ │
│  │  • Real-time Events (messages, typing, offers)           │ │
│  └──────────┬───────────────────────────────────────────────┘ │
│             │                                                   │
│  ┌──────────▼───────────────────────────────────────────────┐ │
│  │                     Routes Layer                          │ │
│  │  /api/auth     /api/chat     /api/products               │ │
│  └──────────┬───────────────────────────────────────────────┘ │
│             │                                                   │
│  ┌──────────▼───────────────────────────────────────────────┐ │
│  │                  Controllers Layer                        │ │
│  │  • authController  • chatController  • productController │ │
│  └──────────┬───────────────────────────────────────────────┘ │
│             │                                                   │
│  ┌──────────▼───────────────────────────────────────────────┐ │
│  │                   Services Layer                          │ │
│  │  • authService    • chatService                          │ │
│  └──────────┬───────────────────────────────────────────────┘ │
│             │                                                   │
│  ┌──────────▼───────────────────────────────────────────────┐ │
│  │                  DAL/Repositories                         │ │
│  │  • users    • products    • conversations    • messages  │ │
│  └──────────┬───────────────────────────────────────────────┘ │
│             │                                                   │
│  ┌──────────▼───────────────────────────────────────────────┐ │
│  │                     Models Layer                          │ │
│  │  • User    • Product    • Conversation    • Message      │ │
│  └──────────┬───────────────────────────────────────────────┘ │
└─────────────┼────────────────────────────────────────────────┘
              │
              │ MongoDB Queries
              │
┌─────────────▼────────────────────────────────────────────────┐
│                      MongoDB Database                         │
├───────────────────────────────────────────────────────────────┤
│  Collections:                                                  │
│  • users           • products                                  │
│  • conversations   • messages                                  │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Starting a Conversation Flow

```
Buyer                  Frontend              Backend              Database
  │                       │                      │                    │
  │ Click "Contact"       │                      │                    │
  ├──────────────────────>│                      │                    │
  │                       │ POST /conversations  │                    │
  │                       ├─────────────────────>│                    │
  │                       │                      │ Check existing     │
  │                       │                      ├───────────────────>│
  │                       │                      │<───────────────────┤
  │                       │                      │ Create if needed   │
  │                       │                      ├───────────────────>│
  │                       │<─────────────────────┤                    │
  │ Navigate to /chat     │                      │                    │
  │<──────────────────────┤                      │                    │
  │                       │                      │                    │
```

### 2. Real-Time Message Flow

```
Sender                Frontend            Socket.io Server        Database
  │                      │                       │                   │
  │ Type message         │                       │                   │
  ├─────────────────────>│ emit 'send_message'   │                   │
  │                      ├──────────────────────>│                   │
  │                      │                       │ Save to DB        │
  │                      │                       ├──────────────────>│
  │                      │                       │<──────────────────┤
  │                      │                       │                   │
  │                      │                       │ emit 'new_message'│
  │                      │<──────────────────────┤ (to room)         │
  │ See message          │                       │                   │
  │<─────────────────────┤                       │                   │
  │                      │                       │                   │
                         │                       ▼                   │
                    Receiver                     │                   │
                         │<──────────────────────┤                   │
                         │ Receive 'new_message' │                   │
```

### 3. Offer Negotiation Flow

```
Buyer              Seller              Backend              Database
  │                  │                     │                    │
  │ Make Offer       │                     │                    │
  ├─────────────────────────────────────> │                    │
  │                  │   Socket: offer     │ Create offer msg   │
  │                  │                     ├───────────────────>│
  │                  │<────────────────────┤                    │
  │                  │ New offer arrives   │                    │
  │                  │                     │                    │
  │                  │ Accept/Reject       │                    │
  │                  ├────────────────────>│                    │
  │                  │                     │ Update status      │
  │                  │                     ├───────────────────>│
  │<────────────────────────────────────────┤                  │
  │ Status updated   │<────────────────────┤                    │
  │ (both parties notified)                 │                    │
```

## Socket.io Room Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Socket.io Server                      │
├────────────────────────────────────────────────────────┤
│                                                          │
│  User Rooms (Personal)                                  │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ user:<userId1>   │  │ user:<userId2>   │           │
│  │ - Socket1        │  │ - Socket3        │           │
│  └──────────────────┘  └──────────────────┘           │
│                                                          │
│  Conversation Rooms                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ conversation:<conversationId1>                    │  │
│  │ - Socket1 (Buyer)                                 │  │
│  │ - Socket2 (Seller)                                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ conversation:<conversationId2>                    │  │
│  │ - Socket3 (Buyer)                                 │  │
│  │ - Socket4 (Seller)                                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└────────────────────────────────────────────────────────┘
```

## Message Types & States

```
┌─────────────────────────────────────────────────────────┐
│                     Message Types                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  TEXT MESSAGE                                            │
│  ┌────────────────────────────────────────────┐         │
│  │ • messageType: "text"                      │         │
│  │ • content: "Hello, is this available?"     │         │
│  │ • read: false → true                       │         │
│  └────────────────────────────────────────────┘         │
│                                                           │
│  OFFER MESSAGE                                           │
│  ┌────────────────────────────────────────────┐         │
│  │ • messageType: "offer"                     │         │
│  │ • content: "Offer: $4500"                  │         │
│  │ • offerAmount: 4500                        │         │
│  │ • offerStatus: "pending" → "accepted"      │         │
│  │                         → "rejected"       │         │
│  │                         → "countered"      │         │
│  └────────────────────────────────────────────┘         │
│                                                           │
│  SYSTEM MESSAGE                                          │
│  ┌────────────────────────────────────────────┐         │
│  │ • messageType: "system"                    │         │
│  │ • content: "Offer accepted"                │         │
│  └────────────────────────────────────────────┘         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌────────────────────────────────────────────────────────┐
│                  Authentication Flow                    │
├────────────────────────────────────────────────────────┤
│                                                          │
│  1. HTTP Authentication (REST API)                      │
│     ┌──────────────────────────────────────┐           │
│     │ POST /api/auth/signin                │           │
│     │ → Returns JWT token                  │           │
│     │ → Store in localStorage               │           │
│     └──────────────────────────────────────┘           │
│                                                          │
│  2. Socket.io Authentication                            │
│     ┌──────────────────────────────────────┐           │
│     │ Connect with auth.token              │           │
│     │ → Middleware verifies JWT            │           │
│     │ → Attaches user to socket            │           │
│     │ → Connection established             │           │
│     └──────────────────────────────────────┘           │
│                                                          │
│  3. Protected Routes                                    │
│     ┌──────────────────────────────────────┐           │
│     │ All API requests include:            │           │
│     │ Authorization: Bearer <token>        │           │
│     │ → Middleware validates token         │           │
│     │ → Attaches req.user                  │           │
│     └──────────────────────────────────────┘           │
│                                                          │
└────────────────────────────────────────────────────────┘
```

## Database Schema Relationships

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    User     │         │   Product    │         │Conversation │
├─────────────┤         ├──────────────┤         ├─────────────┤
│ _id         │<────────┤ seller (ref) │<────────┤ product     │
│ name        │         │ title        │         │ (ref)       │
│ email       │         │ description  │         ├─────────────┤
│ role        │         │ price        │    ┌────┤ buyer (ref) │
│ password    │         │ category     │    │    │ seller      │
└─────────────┘         │ images[]     │    │    │ (ref)       │
      ▲                 │ location     │    │    │ lastMessage │
      │                 │ status       │    │    │ lastMsg...  │
      │                 └──────────────┘    │    └─────────────┘
      │                                     │           ▲
      │                                     │           │
      │                                     │           │
      │                 ┌──────────────┐    │           │
      │                 │   Message    │    │           │
      │                 ├──────────────┤    │           │
      └─────────────────┤ sender (ref) │    │           │
                        │ conversation ├────┘           │
                        │ (ref)        │────────────────┘
                        │ content      │
                        │ messageType  │
                        │ offerAmount  │
                        │ offerStatus  │
                        │ read         │
                        └──────────────┘
```

## Component Hierarchy

```
App.jsx
│
├── Home
│
├── SignIn/SignUp
│
├── Products
│   ├── Card (Product Cards)
│   │   ├── Button (Contact Seller)
│   │   └── Product Info
│   └── Filters
│
└── Chat
    ├── ConversationList (Left Panel)
    │   └── ConversationItem (× n)
    │       ├── Product Thumbnail
    │       ├── User Info
    │       └── Last Message Preview
    │
    └── ChatArea (Right Panel)
        ├── ChatHeader
        │   ├── User Name
        │   └── Product Info
        │
        ├── MessageList
        │   └── MessageBubble (× n)
        │       ├── Text Content
        │       ├── Offer Details
        │       ├── Timestamp
        │       └── Read Receipt
        │
        └── MessageInput
            ├── Text Input
            ├── Make Offer Button
            └── Send Button
```

## Key Features Summary

### Real-Time Features (Socket.io)

- ✅ Instant message delivery
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Read receipts
- ✅ Offer updates

### REST API Features

- ✅ User authentication (JWT)
- ✅ Product CRUD operations
- ✅ Conversation management
- ✅ Message history retrieval
- ✅ Offer status updates

### Security Features

- ✅ JWT authentication
- ✅ Socket.io auth middleware
- ✅ Route protection
- ✅ User authorization checks
- ✅ Seller verification

### UX Features

- ✅ Responsive design
- ✅ Real-time updates
- ✅ Product context in chat
- ✅ Visual offer system
- ✅ Conversation previews
- ✅ Unread message indicators
