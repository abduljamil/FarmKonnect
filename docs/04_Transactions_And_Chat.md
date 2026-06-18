# 4. Transactions and Real-Time Chat

This document maps out the specific data flows and logic for user-to-user negotiations, order placement, and real-time chat in the FarmKonnect system.

## 4.1 Order & Transaction Lifecycle

The FarmKonnect marketplace acts as an escrow-like state machine between the farmer (seller) and the buyer.

```mermaid
sequenceDiagram
    actor Buyer
    participant Client as Frontend/Mobile App
    participant API as Backend API
    participant DB as MongoDB
    actor Seller

    Buyer->>Client: Clicks "Buy Now" on Listing
    Client->>API: POST /api/transactions
    API->>DB: Create Transaction (Status: Pending)
    API-->>Client: Return Transaction ID
    
    API->>Seller: Send Push Notification (New Order)
    
    Seller->>Client: Reviews Transaction
    alt Seller Accepts
        Client->>API: PUT /api/transactions/:id/status (Accept)
        API->>DB: Update Status -> 'accepted'
        API->>Buyer: Notify (Order Accepted)
        
        Buyer->>Client: Proceeds to Payment
        alt Local Payment
            Client->>API: Mark as 'completed'
        else Stripe Gateway
            Client->>API: Process Payment Intent
            API->>DB: Update Stripe ID & Status -> 'completed'
        end
        API->>DB: Deduct Listing Quantity
    else Seller Rejects
        Client->>API: PUT /api/transactions/:id/status (Reject)
        API->>DB: Update Status -> 'cancelled'
        API->>Buyer: Notify (Order Cancelled)
    end
```

### 4.1.1 Status Definitions
- `pending`: The buyer has requested the crop. The inventory is locked but not deducted.
- `accepted`: The seller has verified they can fulfill the order.
- `completed`: Payment has been resolved (either manually acknowledged for cash/transfer or automatically verified via Stripe webhook). Inventory is permanently deducted.
- `cancelled`: Either party aborted the trade. Inventory lock is released.

## 4.2 Real-Time Communication (Socket.io)

For B2B agricultural trading, negotiation is critical. FarmKonnect implements a fully real-time messaging system.

```mermaid
sequenceDiagram
    participant B as Buyer Client
    participant S as Socket.io Server (Node.js)
    participant M as MongoDB
    participant Seller as Seller Client

    B->>S: connect() + emit('join', userId)
    Seller->>S: connect() + emit('join', userId)

    B->>S: emit('sendMessage', { to: SellerId, text: "Is the wheat dry?" })
    
    S->>M: Save Message to DB (read: false)
    
    alt Seller is online
        S->>Seller: emit('newMessage', MessagePayload)
    else Seller is offline
        S->>M: Trigger Push Notification Job
    end
    
    Seller->>S: emit('markAsRead', MessageId)
    S->>M: Update Message (read: true)
    S->>B: emit('messageRead', MessageId)
```

### 4.2.1 Real-Time Architecture Details
- **Namespace & Rooms**: Users join a personal Socket.io room based on their `userId`. This allows the server to cleanly route private messages.
- **Persistence**: Every socket emission is backed by a database write to the `messages` collection. This ensures that if a user loses connection, they retrieve the full history via HTTP (`GET /api/chat/history`) upon reconnecting.
- **Typing Indicators**: Ephemeral socket events (`typing`, `stopTyping`) are broadcasted to enhance the UX without hitting the database.
