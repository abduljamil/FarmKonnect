const Transaction = require("../models/Transaction");
const Listing = require("../models/Listing");
const User = require("../models/User");
const paymentService = require("../services/paymentService");
const crypto = require("crypto");

// Constants
const MIN_TRANSACTION_AMOUNT = 100;
const MAX_TRANSACTION_AMOUNT = 10000000;
const MAX_CONCURRENT_TRANSACTIONS_PER_LISTING = 5;

// Helper to generate idempotency key
const generateIdempotencyKey = (userId, listingId) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  return `${userId}_${listingId}_${timestamp}_${random}`;
};

// @desc    Create a new transaction
// @route   POST /api/payments/transactions
// @access  Private
exports.createTransaction = async (req, res) => {
  try {
    const {
      listingId,
      amount,
      quantity,
      paymentMethod,
      deliveryAddress,
      deliveryNotes,
      buyerPhone,
      conversationId,
      deliveryLocation,
      idempotencyKey: clientIdempotencyKey,
    } = req.body;

    // Validate amount
    if (!amount || amount < MIN_TRANSACTION_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Minimum transaction amount is Rs. ${MIN_TRANSACTION_AMOUNT}`,
      });
    }

    if (amount > MAX_TRANSACTION_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Maximum transaction amount is Rs. ${MAX_TRANSACTION_AMOUNT}`,
      });
    }

    // Validate quantity
    if (quantity && (quantity < 1 || quantity > 10000)) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 1 and 10000",
      });
    }

    // Validate listing exists
    const listing = await Listing.findById(listingId).populate("createdBy", "name phone jazzcashNumber status");
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Validate quantity availability
    if (quantity > listing.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${listing.quantity} units available`,
      });
    }

    // Can't buy your own listing
    if (listing.createdBy._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot purchase your own listing",
      });
    }

    // Check listing is active
    if (listing.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This listing is no longer available",
      });
    }

    // Check seller account status
    if (listing.createdBy.status === "suspended") {
      return res.status(400).json({
        success: false,
        message: "This seller's account is currently suspended",
      });
    }

    // Check concurrent transactions limit for this listing
    const pendingTransactions = await Transaction.countDocuments({
      listing: listingId,
      orderStatus: { $in: ["pending", "confirmed"] },
    });

    if (pendingTransactions >= MAX_CONCURRENT_TRANSACTIONS_PER_LISTING) {
      return res.status(400).json({
        success: false,
        message: "Too many pending orders for this listing. Please try again later.",
      });
    }

    // Validate delivery address (minimum 10 characters)
    if (!deliveryAddress || deliveryAddress.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid delivery address (minimum 10 characters)",
      });
    }

    // Validate phone number (Pakistani format: 03XXXXXXXXX)
    const phoneRegex = /^03[0-9]{9}$/;
    if (!buyerPhone || !phoneRegex.test(buyerPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid Pakistani phone number (03XXXXXXXXX)",
      });
    }

    // Generate idempotency key if not provided
    const idempotencyKey = clientIdempotencyKey || generateIdempotencyKey(req.user._id, listingId);

    // Check for duplicate transaction with same idempotency key
    const existingTransaction = await Transaction.findOne({ idempotencyKey });
    if (existingTransaction) {
      // Return existing transaction instead of creating duplicate
      const populatedTx = await Transaction.findById(existingTransaction._id)
        .populate("listing", "title images price")
        .populate("buyer", "name email phone")
        .populate("seller", "name email phone jazzcashNumber");

      return res.status(200).json({
        success: true,
        message: "Transaction already exists",
        data: populatedTx,
        duplicate: true,
      });
    }

    // Format delivery location
    let formattedLocation = null;
    if (deliveryLocation) {
      const lat = deliveryLocation.latitude || deliveryLocation.lat;
      const lng = deliveryLocation.longitude || deliveryLocation.lng;
      if (lat && lng) {
        formattedLocation = {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          address: deliveryLocation.address || deliveryAddress
        };
      }
    }

    // Create transaction
    const transaction = await Transaction.create({
      listing: listingId,
      buyer: req.user._id,
      seller: listing.createdBy._id,
      conversation: conversationId || null,
      amount,
      quantity: quantity || 1,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      deliveryAddress,
      deliveryNotes,
      deliveryLocation: formattedLocation,
      buyerPhone: buyerPhone || req.user.phone,
      sellerPhone: listing.createdBy.phone,
      platformFee: 0,
      idempotencyKey,
    });

    // Populate for response
    await transaction.populate([
      { path: "listing", select: "title images price" },
      { path: "buyer", select: "name email phone" },
      { path: "seller", select: "name email phone jazzcashNumber" },
    ]);

    // Emit socket notification to seller
    const io = req.io;
    if (io) {
      io.to(`user:${listing.createdBy._id}`).emit("newOrder", {
        transactionId: transaction._id,
        listingTitle: listing.title,
        buyerName: req.user.name,
        amount: transaction.amount,
        quantity: transaction.quantity,
        orderStatus: transaction.orderStatus,
        createdAt: transaction.createdAt,
      });

      io.to(`user:${req.user._id.toString()}`).emit("orderStatusUpdate", {
        transactionId: transaction._id.toString(),
        listingTitle: listing.title,
        sellerName: listing.createdBy.name,
        newStatus: "pending",
        message: "Your order has been placed successfully!",
        createdAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Create transaction error:", error);

    // Handle duplicate key error for idempotency
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      return res.status(409).json({
        success: false,
        message: "Duplicate transaction request. Please wait and try again.",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create transaction",
    });
  }
};

// @desc    Process payment for transaction (JazzCash)
// @route   POST /api/payments/transactions/:id/pay
// @access  Private (Buyer only)
exports.processPayment = async (req, res) => {
  try {
    const { mobileNumber, cnic, paymentIdempotencyKey } = req.body;

    // Use optimistic locking to prevent race conditions
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Only buyer can pay
    if (transaction.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can make payment",
      });
    }

    // Check payment is pending
    if (transaction.paymentStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Payment already ${transaction.paymentStatus}`,
        currentStatus: transaction.paymentStatus,
      });
    }

    // Check order status allows payment
    if (!["pending", "confirmed"].includes(transaction.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot process payment for ${transaction.orderStatus} order`,
      });
    }

    // For COD, just acknowledge the order placement
    if (transaction.paymentMethod === "cod") {
      await transaction.save();

      // Update listing quantity and status for COD
      const listing = await Listing.findById(transaction.listing);
      if (listing) {
        listing.quantity = Math.max(0, listing.quantity - transaction.quantity);
        if (listing.quantity === 0) {
          listing.status = "sold";
        }
        await listing.save();
      }

      const populatedTx = await Transaction.findById(transaction._id)
        .populate("listing", "title images price")
        .populate("buyer", "name email phone avatar")
        .populate("seller", "name email phone avatar");

      return res.status(200).json({
        success: true,
        message: "Order placed successfully. Waiting for seller confirmation.",
        data: populatedTx,
      });
    }

    // Process JazzCash payment
    if (transaction.paymentMethod === "jazzcash") {
      // Validate mobile number
      const phoneRegex = /^03[0-9]{9}$/;
      if (!mobileNumber || !phoneRegex.test(mobileNumber)) {
        return res.status(400).json({
          success: false,
          message: "Valid JazzCash mobile number is required (03XXXXXXXXX)",
        });
      }

      // Check if already has a JazzCash transaction ID (prevent double charge)
      if (transaction.jazzcashTransactionId) {
        return res.status(400).json({
          success: false,
          message: "Payment already processed for this transaction",
          transactionId: transaction.jazzcashTransactionId,
        });
      }

      const paymentResult = await paymentService.initiatePayment({
        amount: transaction.amount,
        mobileNumber,
        cnic: cnic || "",
        description: `FarmKonnect Payment - Transaction ${transaction._id}`,
        transactionId: transaction._id.toString(),
        idempotencyKey: paymentIdempotencyKey,
      });

      if (paymentResult.success) {
        // Use atomic update to prevent race conditions
        const updatedTransaction = await Transaction.findOneAndUpdate(
          {
            _id: transaction._id,
            paymentStatus: "pending", // Only update if still pending
            jazzcashTransactionId: { $exists: false }, // Ensure no existing transaction ID
          },
          {
            $set: {
              paymentStatus: "paid",
              orderStatus: "confirmed",
              jazzcashTransactionId: paymentResult.transactionId,
              jazzcashResponse: paymentResult.rawResponse,
              paidAt: new Date(),
              confirmedAt: new Date(),
              escrowHeldAt: new Date(),
              escrowExpiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            },
            $inc: { "listing.quantity": -transaction.quantity }
          },
          { new: true }
        );

        // Update listing quantity and status
        const listing = await Listing.findById(transaction.listing);
        if (listing) {
          listing.quantity = Math.max(0, listing.quantity - transaction.quantity);
          if (listing.quantity === 0) {
            listing.status = "sold";
          }
          await listing.save();
        }

        if (!updatedTransaction) {
          // Transaction was already updated by another request
          return res.status(409).json({
            success: false,
            message: "Payment was already processed. Please refresh to see current status.",
          });
        }

        // Emit notifications
        const io = req.io;
        if (io) {
          const populatedTx = await Transaction.findById(transaction._id)
            .populate("listing", "title")
            .populate("buyer", "name")
            .populate("seller", "name");

          io.to(`user:${transaction.seller.toString()}`).emit("orderStatusUpdate", {
            transactionId: transaction._id.toString(),
            listingTitle: populatedTx.listing?.title,
            buyerName: populatedTx.buyer?.name,
            newStatus: "paid",
            message: `Payment received for ${populatedTx.listing?.title}!`,
            createdAt: new Date(),
          });

          io.to(`user:${transaction.buyer.toString()}`).emit("orderStatusUpdate", {
            transactionId: transaction._id.toString(),
            listingTitle: populatedTx.listing?.title,
            sellerName: populatedTx.seller?.name,
            newStatus: "paid",
            message: "Payment successful! Your order is confirmed.",
            createdAt: new Date(),
          });
        }

        return res.status(200).json({
          success: true,
          message: paymentResult.demo ? "Payment successful (Demo Mode)" : "Payment successful",
          demo: paymentResult.demo,
          data: updatedTransaction,
        });
      } else {
        // Payment failed
        transaction.paymentStatus = "failed";
        transaction.jazzcashResponse = paymentResult.rawResponse;
        await transaction.save();

        return res.status(400).json({
          success: false,
          message: paymentResult.responseMessage || "Payment failed",
          data: transaction,
        });
      }
    }

    res.status(400).json({
      success: false,
      message: "Invalid payment method",
    });
  } catch (error) {
    console.error("Process payment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process payment",
    });
  }
};

// @desc    Mark transaction as delivered
// @route   PUT /api/payments/transactions/:id/deliver
// @access  Private (Seller only)
exports.markDelivered = async (req, res) => {
  try {
    const deliveryProofImages = req.body?.deliveryProofImages;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Only seller can mark as delivered
    if (transaction.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the seller can mark as delivered",
      });
    }

    // Check order is confirmed
    if (transaction.orderStatus !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Order must be confirmed before marking as delivered",
      });
    }

    // Validate delivery proof images URLs
    if (deliveryProofImages && Array.isArray(deliveryProofImages)) {
      if (deliveryProofImages.length > 5) {
        return res.status(400).json({
          success: false,
          message: "Maximum 5 delivery proof images allowed",
        });
      }

      // Validate each URL
      const urlRegex = /^https?:\/\/.+/;
      for (const url of deliveryProofImages) {
        if (!urlRegex.test(url)) {
          return res.status(400).json({
            success: false,
            message: "Invalid image URL provided",
          });
        }
      }

      transaction.deliveryProofImages = deliveryProofImages;
      transaction.deliveryProofUploadedAt = new Date();
    }

    transaction.orderStatus = "delivered";
    transaction.deliveredAt = new Date();
    await transaction.save();

    const populatedTx = await Transaction.findById(transaction._id)
      .populate("listing", "title images price")
      .populate("buyer", "name email phone avatar")
      .populate("seller", "name email phone avatar");

    const io = req.io;
    if (io) {
      io.to(`user:${transaction.buyer.toString()}`).emit("orderStatusUpdate", {
        transactionId: transaction._id.toString(),
        listingTitle: populatedTx.listing?.title,
        sellerName: populatedTx.seller?.name,
        newStatus: "delivered",
        message: "Your order has been marked as delivered",
        hasProofImages: deliveryProofImages?.length > 0,
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Order marked as delivered",
      data: populatedTx,
    });
  } catch (error) {
    console.error("Mark delivered error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update transaction",
    });
  }
};

// @desc    Confirm order (Seller only)
// @route   PUT /api/payments/transactions/:id/confirm
// @access  Private (Seller only)
exports.confirmOrder = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the seller can confirm the order",
      });
    }

    if (transaction.orderStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm order with status ${transaction.orderStatus}`,
      });
    }

    transaction.orderStatus = "confirmed";
    transaction.confirmedAt = new Date();
    await transaction.save();

    const populatedTx = await Transaction.findById(transaction._id)
      .populate("listing", "title images price")
      .populate("buyer", "name email phone avatar")
      .populate("seller", "name email phone avatar");

    const io = req.io;
    if (io) {
      io.to(`user:${transaction.buyer.toString()}`).emit("orderStatusUpdate", {
        transactionId: transaction._id.toString(),
        listingTitle: populatedTx.listing?.title,
        sellerName: populatedTx.seller?.name,
        newStatus: "confirmed",
        message: "Your order has been confirmed by the seller!",
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Order confirmed successfully",
      data: populatedTx,
    });
  } catch (error) {
    console.error("Confirm order error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm order",
    });
  }
};

// @desc    Buyer rejects delivery
// @route   PUT /api/payments/transactions/:id/reject-delivery
// @access  Private (Buyer only)
exports.rejectDelivery = async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can reject delivery",
      });
    }

    if (transaction.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Can only reject delivery for delivered orders",
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for rejection (minimum 10 characters)",
      });
    }

    transaction.buyerRejectedDelivery = true;
    transaction.buyerRejectionReason = reason;
    transaction.buyerRejectedAt = new Date();
    transaction.orderStatus = "disputed";
    transaction.disputeReason = "delivery_issue";
    transaction.disputeDescription = reason;
    transaction.disputedAt = new Date();
    transaction.disputedBy = req.user._id;
    await transaction.save();

    const populatedTx = await Transaction.findById(transaction._id)
      .populate("listing", "title images price")
      .populate("buyer", "name email phone avatar")
      .populate("seller", "name email phone avatar");

    const io = req.io;
    if (io) {
      // Notify seller
      io.to(`user:${transaction.seller.toString()}`).emit("orderStatusUpdate", {
        transactionId: transaction._id.toString(),
        listingTitle: populatedTx.listing?.title,
        buyerName: populatedTx.buyer?.name,
        newStatus: "delivery_rejected",
        message: `Buyer rejected delivery: ${reason}`,
        createdAt: new Date(),
      });

      // Notify admins
      const admins = await User.find({ role: "admin" }, "_id");
      admins.forEach((admin) => {
        io.to(`user:${admin._id.toString()}`).emit("adminNotification", {
          type: "delivery_rejection",
          transactionId: transaction._id.toString(),
          message: `Delivery rejected for order "${populatedTx.listing?.title}"`,
          reason,
          createdAt: new Date(),
        });
      });
    }

    res.status(200).json({
      success: true,
      message: "Delivery rejected. A dispute has been opened.",
      data: populatedTx,
    });
  } catch (error) {
    console.error("Reject delivery error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject delivery",
    });
  }
};

// @desc    Confirm delivery and complete transaction
// @route   PUT /api/payments/transactions/:id/complete
// @access  Private (Buyer only)
exports.completeTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can confirm delivery",
      });
    }

    if (transaction.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Order must be marked as delivered first",
      });
    }

    // Use atomic update
    const updatedTransaction = await Transaction.findOneAndUpdate(
      {
        _id: transaction._id,
        orderStatus: "delivered",
      },
      {
        $set: {
          orderStatus: "completed",
          completedAt: new Date(),
          ...(transaction.paymentMethod === "cod" && transaction.paymentStatus === "pending" ? {
            paymentStatus: "paid",
            paidAt: new Date(),
          } : {}),
        },
      },
      { new: true }
    );

    if (!updatedTransaction) {
      return res.status(409).json({
        success: false,
        message: "Transaction status changed. Please refresh.",
      });
    }

    // For JazzCash, trigger payout
    if (transaction.paymentMethod === "jazzcash" && updatedTransaction.paymentStatus === "paid") {
      const seller = await User.findById(transaction.seller);
      if (seller && seller.jazzcashNumber && updatedTransaction.sellerAmount > 0) {
        try {
          const payoutResult = await paymentService.initiatePayout({
            amount: updatedTransaction.sellerAmount,
            mobileNumber: seller.jazzcashNumber,
            transactionId: transaction._id.toString(),
          });

          if (payoutResult.success) {
            await Transaction.findByIdAndUpdate(transaction._id, {
              payoutStatus: "completed",
              payoutTransactionId: payoutResult.payoutId,
              payoutCompletedAt: new Date(),
              paymentStatus: "released",
            });

            const io = req.io;
            if (io) {
              const populatedTx = await Transaction.findById(transaction._id)
                .populate("listing", "title")
                .populate("buyer", "name");

              io.to(`user:${transaction.seller.toString()}`).emit("orderStatusUpdate", {
                transactionId: transaction._id.toString(),
                listingTitle: populatedTx.listing?.title,
                buyerName: populatedTx.buyer?.name,
                newStatus: "released",
                message: `Payment of Rs. ${updatedTransaction.sellerAmount?.toLocaleString()} has been released to your account!`,
                createdAt: new Date(),
              });
            }
          } else {
            // Mark payout as pending for manual processing
            await Transaction.findByIdAndUpdate(transaction._id, {
              payoutStatus: "pending",
              payoutAttempts: 1,
              payoutLastAttemptAt: new Date(),
            });
          }
        } catch (payoutError) {
          console.error("Payout error:", payoutError);
          await Transaction.findByIdAndUpdate(transaction._id, {
            payoutStatus: "failed",
            payoutAttempts: 1,
            payoutLastAttemptAt: new Date(),
          });
        }
      }
    }

    const populatedTx = await Transaction.findById(transaction._id)
      .populate("listing", "title images price")
      .populate("buyer", "name email phone avatar")
      .populate("seller", "name email phone avatar");

    const io = req.io;
    if (io) {
      io.to(`user:${transaction.seller.toString()}`).emit("orderStatusUpdate", {
        transactionId: transaction._id.toString(),
        listingTitle: populatedTx.listing?.title,
        buyerName: populatedTx.buyer?.name,
        newStatus: "completed",
        message: "Order completed - buyer confirmed delivery!",
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction completed successfully. You can now rate the seller!",
      data: populatedTx,
    });
  } catch (error) {
    console.error("Complete transaction error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to complete transaction",
    });
  }
};

// @desc    Cancel transaction
// @route   PUT /api/payments/transactions/:id/cancel
// @access  Private (Buyer or Seller)
exports.cancelTransaction = async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const isBuyer = transaction.buyer.toString() === req.user._id.toString();
    const isSeller = transaction.seller.toString() === req.user._id.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this transaction",
      });
    }

    if (["completed", "cancelled"].includes(transaction.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel ${transaction.orderStatus} transaction`,
      });
    }

    // Handle JazzCash paid transactions - initiate refund
    if (transaction.paymentMethod === "jazzcash" && transaction.paymentStatus === "paid") {
      // Mark for refund instead of blocking
      transaction.refundStatus = "pending";
      transaction.refundAmount = transaction.amount;
      transaction.refundReason = reason || "Cancellation requested";
      transaction.refundRequestedAt = new Date();
      transaction.orderStatus = "cancelled";
      transaction.paymentStatus = "refunded";
      transaction.cancelledAt = new Date();
      await transaction.save();

      // Notify admins about refund needed
      const io = req.io;
      if (io) {
        const admins = await User.find({ role: "admin" }, "_id");
        admins.forEach((admin) => {
          io.to(`user:${admin._id.toString()}`).emit("adminNotification", {
            type: "refund_required",
            transactionId: transaction._id.toString(),
            amount: transaction.amount,
            message: `Refund required for cancelled JazzCash transaction`,
            createdAt: new Date(),
          });
        });
      }

      const populatedTx = await Transaction.findById(transaction._id)
        .populate("listing", "title images price")
        .populate("buyer", "name email phone avatar")
        .populate("seller", "name email phone avatar");

      return res.status(200).json({
        success: true,
        message: "Transaction cancelled. Refund will be processed within 3-5 business days.",
        data: populatedTx,
        refundPending: true,
      });
    }

    transaction.orderStatus = "cancelled";
    transaction.paymentStatus = "cancelled";
    transaction.cancelledAt = new Date();
    await transaction.save();

    const populatedTx = await Transaction.findById(transaction._id)
      .populate("listing", "title images price")
      .populate("buyer", "name email phone avatar")
      .populate("seller", "name email phone avatar");

    const io = req.io;
    if (io) {
      const recipientId = isBuyer ? transaction.seller.toString() : transaction.buyer.toString();
      const cancellerName = isBuyer ? populatedTx.buyer?.name : populatedTx.seller?.name;
      io.to(`user:${recipientId}`).emit("orderStatusUpdate", {
        transactionId: transaction._id.toString(),
        listingTitle: populatedTx.listing?.title,
        cancelledBy: cancellerName,
        newStatus: "cancelled",
        message: `Order cancelled by ${cancellerName}`,
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction cancelled",
      data: populatedTx,
    });
  } catch (error) {
    console.error("Cancel transaction error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel transaction",
    });
  }
};

// @desc    Get user's transactions
// @route   GET /api/payments/transactions
// @access  Private
exports.getMyTransactions = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;

    const query = {
      $or: [{ buyer: req.user._id }, { seller: req.user._id }],
    };

    if (role === "buyer") {
      query.$or = [{ buyer: req.user._id }];
    } else if (role === "seller") {
      query.$or = [{ seller: req.user._id }];
    }

    if (status) {
      query.orderStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .populate("listing", "title images price")
      .populate("buyer", "name avatar")
      .populate("seller", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transactions",
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/payments/transactions/:id
// @access  Private
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("listing", "title images price category")
      .populate("buyer", "name email phone avatar")
      .populate("seller", "name email phone avatar jazzcashNumber");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const isBuyer = transaction.buyer._id.toString() === req.user._id.toString();
    const isSeller = transaction.seller._id.toString() === req.user._id.toString();

    if (!isBuyer && !isSeller && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this transaction",
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transaction",
    });
  }
};

// @desc    Get payment service status
// @route   GET /api/payments/status
// @access  Public
exports.getPaymentStatus = async (req, res) => {
  const config = paymentService.isConfigured();

  res.status(200).json({
    success: true,
    data: {
      jazzcash: config,
      availableMethods: ["cod", "jazzcash"],
    },
  });
};

// @desc    Buyer confirms delivery was received (COD)
// @route   PUT /api/payments/transactions/:id/confirm-delivery
// @access  Private (Buyer only)
exports.confirmDeliveryReceived = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can confirm delivery",
      });
    }

    if (transaction.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Order must be marked as delivered by seller first",
      });
    }

    if (transaction.buyerConfirmedDelivery) {
      return res.status(400).json({
        success: false,
        message: "Delivery already confirmed",
      });
    }

    transaction.buyerConfirmedDelivery = true;
    transaction.buyerDeliveryConfirmedAt = new Date();
    await transaction.save();

    const populatedTx = await Transaction.findById(transaction._id)
      .populate("listing", "title images price")
      .populate("buyer", "name email phone avatar")
      .populate("seller", "name email phone avatar");

    const io = req.io;
    if (io) {
      io.to(`user:${transaction.seller.toString()}`).emit("orderStatusUpdate", {
        transactionId: transaction._id.toString(),
        listingTitle: populatedTx.listing?.title,
        buyerName: populatedTx.buyer?.name,
        newStatus: "delivery_confirmed",
        message: `${populatedTx.buyer?.name} confirmed receiving the delivery!`,
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Delivery confirmed successfully. Please confirm payment.",
      data: populatedTx,
    });
  } catch (error) {
    console.error("Confirm delivery error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm delivery",
    });
  }
};

// @desc    Buyer confirms cash payment was made (COD)
// @route   PUT /api/payments/transactions/:id/confirm-payment
// @access  Private (Buyer only)
exports.confirmPaymentMade = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can confirm payment",
      });
    }

    if (transaction.paymentMethod !== "cod") {
      return res.status(400).json({
        success: false,
        message: "This action is only for COD payments",
      });
    }

    if (!transaction.buyerConfirmedDelivery) {
      return res.status(400).json({
        success: false,
        message: "Please confirm delivery first",
      });
    }

    if (transaction.buyerConfirmedPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already confirmed by buyer",
      });
    }

    transaction.buyerConfirmedPayment = true;
    transaction.buyerPaymentConfirmedAt = new Date();
    await transaction.save();

    const populatedTx = await Transaction.findById(transaction._id)
      .populate("listing", "title images price")
      .populate("buyer", "name email phone avatar")
      .populate("seller", "name email phone avatar");

    const io = req.io;
    if (io) {
      io.to(`user:${transaction.seller.toString()}`).emit("orderStatusUpdate", {
        transactionId: transaction._id.toString(),
        listingTitle: populatedTx.listing?.title,
        buyerName: populatedTx.buyer?.name,
        newStatus: "buyer_payment_confirmed",
        message: `${populatedTx.buyer?.name} confirms they made the payment! Please verify and confirm.`,
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment confirmation sent to seller. Waiting for seller to confirm receipt.",
      data: populatedTx,
    });
  } catch (error) {
    console.error("Confirm payment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm payment",
    });
  }
};

// @desc    Seller confirms cash payment was received (COD)
// @route   PUT /api/payments/transactions/:id/seller-confirm-payment
// @access  Private (Seller only)
exports.sellerConfirmPayment = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the seller can confirm payment receipt",
      });
    }

    if (transaction.paymentMethod !== "cod") {
      return res.status(400).json({
        success: false,
        message: "This action is only for COD payments",
      });
    }

    // Verify proper COD sequence
    if (transaction.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Order must be in delivered status",
      });
    }

    if (!transaction.buyerConfirmedDelivery) {
      return res.status(400).json({
        success: false,
        message: "Buyer has not confirmed delivery yet",
      });
    }

    if (!transaction.buyerConfirmedPayment) {
      return res.status(400).json({
        success: false,
        message: "Buyer has not confirmed payment yet",
      });
    }

    if (transaction.sellerConfirmedPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already confirmed",
      });
    }

    // Use atomic update
    const updatedTransaction = await Transaction.findOneAndUpdate(
      {
        _id: transaction._id,
        orderStatus: "delivered",
        buyerConfirmedDelivery: true,
        buyerConfirmedPayment: true,
        sellerConfirmedPayment: false,
      },
      {
        $set: {
          sellerConfirmedPayment: true,
          sellerPaymentConfirmedAt: new Date(),
          paymentStatus: "paid",
          paidAt: new Date(),
          orderStatus: "completed",
          completedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedTransaction) {
      return res.status(409).json({
        success: false,
        message: "Transaction state changed. Please refresh and try again.",
      });
    }

    const populatedTx = await Transaction.findById(transaction._id)
      .populate("listing", "title images price")
      .populate("buyer", "name email phone avatar")
      .populate("seller", "name email phone avatar");

    const io = req.io;
    if (io) {
      io.to(`user:${transaction.buyer.toString()}`).emit("orderStatusUpdate", {
        transactionId: transaction._id.toString(),
        listingTitle: populatedTx.listing?.title,
        sellerName: populatedTx.seller?.name,
        newStatus: "completed",
        message: `Payment confirmed by ${populatedTx.seller?.name}! Transaction complete.`,
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment confirmed. Transaction completed!",
      data: populatedTx,
    });
  } catch (error) {
    console.error("Seller confirm payment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm payment",
    });
  }
};

// @desc    Raise a dispute on transaction
// @route   PUT /api/payments/transactions/:id/dispute
// @access  Private (Buyer or Seller)
exports.raiseDispute = async (req, res) => {
  try {
    const { reason, description } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const isBuyer = transaction.buyer.toString() === req.user._id.toString();
    const isSeller = transaction.seller.toString() === req.user._id.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: "Only buyer or seller can raise a dispute",
      });
    }

    // Check if dispute can be raised
    if (!transaction.canRaiseDispute()) {
      return res.status(400).json({
        success: false,
        message: transaction.orderStatus === "completed"
          ? "Dispute window has expired for this completed transaction"
          : `Cannot raise dispute on ${transaction.orderStatus} transaction`,
      });
    }

    const validReasons = [
      "payment_not_received",
      "wrong_amount",
      "product_issue",
      "delivery_issue",
      "item_not_received",
      "item_not_as_described",
      "other"
    ];

    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: "Valid dispute reason is required",
        validReasons,
      });
    }

    if (transaction.orderStatus === "disputed") {
      return res.status(400).json({
        success: false,
        message: "Transaction is already disputed",
      });
    }

    transaction.orderStatus = "disputed";
    transaction.disputeReason = reason;
    transaction.disputeDescription = description || "";
    transaction.disputedAt = new Date();
    transaction.disputedBy = req.user._id;
    // Deadline is set automatically in pre-save hook
    await transaction.save();

    const populatedTx = await Transaction.findById(transaction._id)
      .populate("listing", "title images price")
      .populate("buyer", "name email phone avatar")
      .populate("seller", "name email phone avatar")
      .populate("disputedBy", "name");

    const io = req.io;
    if (io) {
      const otherParty = isBuyer ? transaction.seller.toString() : transaction.buyer.toString();
      const disputerName = isBuyer ? populatedTx.buyer?.name : populatedTx.seller?.name;

      io.to(`user:${otherParty}`).emit("orderStatusUpdate", {
        transactionId: transaction._id.toString(),
        listingTitle: populatedTx.listing?.title,
        newStatus: "disputed",
        message: `${disputerName} raised a dispute: ${reason.replace(/_/g, " ")}`,
        createdAt: new Date(),
      });

      const admins = await User.find({ role: "admin" }, "_id");
      admins.forEach((admin) => {
        io.to(`user:${admin._id.toString()}`).emit("adminNotification", {
          type: "dispute",
          transactionId: transaction._id.toString(),
          listingTitle: populatedTx.listing?.title,
          reason: reason,
          description: description,
          disputedBy: disputerName,
          buyerName: populatedTx.buyer?.name,
          sellerName: populatedTx.seller?.name,
          amount: transaction.amount,
          deadline: transaction.disputeDeadline,
          message: `DISPUTE: ${disputerName} raised a dispute on order for "${populatedTx.listing?.title}" - Reason: ${reason.replace(/_/g, " ")}`,
          createdAt: new Date(),
        });
      });
    }

    res.status(200).json({
      success: true,
      message: "Dispute raised successfully. Admin has been notified and will resolve within 7 days.",
      data: populatedTx,
      disputeDeadline: transaction.disputeDeadline,
    });
  } catch (error) {
    console.error("Raise dispute error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to raise dispute",
    });
  }
};

// @desc    Process refund for a transaction
// @route   PUT /api/payments/transactions/:id/refund
// @access  Private (Admin only)
exports.processRefund = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can process refunds",
      });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.refundStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Refund already processed",
      });
    }

    if (transaction.paymentMethod !== "jazzcash" || transaction.paymentStatus !== "refunded") {
      return res.status(400).json({
        success: false,
        message: "Transaction is not eligible for refund",
      });
    }

    // Process refund through JazzCash
    const refundResult = await paymentService.processRefund({
      amount: transaction.refundAmount || transaction.amount,
      originalTransactionId: transaction.jazzcashTransactionId,
      transactionId: transaction._id.toString(),
    });

    if (refundResult.success) {
      transaction.refundStatus = "completed";
      transaction.refundTransactionId = refundResult.refundId;
      transaction.refundCompletedAt = new Date();
      await transaction.save();

      // Notify buyer
      const io = req.io;
      if (io) {
        io.to(`user:${transaction.buyer.toString()}`).emit("orderStatusUpdate", {
          transactionId: transaction._id.toString(),
          newStatus: "refund_completed",
          message: `Refund of Rs. ${transaction.refundAmount?.toLocaleString()} has been processed!`,
          createdAt: new Date(),
        });
      }

      return res.status(200).json({
        success: true,
        message: "Refund processed successfully",
        data: transaction,
      });
    } else {
      transaction.refundStatus = "failed";
      await transaction.save();

      return res.status(400).json({
        success: false,
        message: refundResult.message || "Refund processing failed",
      });
    }
  } catch (error) {
    console.error("Process refund error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process refund",
    });
  }
};

// @desc    Auto-release expired escrow (called by cron job)
// @route   POST /api/payments/auto-release-escrow
// @access  Private (System only - should be called by cron)
exports.autoReleaseEscrow = async (req, res) => {
  try {
    // This should be protected by an API key or called internally
    const expiredTransactions = await Transaction.findExpiredEscrow();

    const results = [];
    for (const transaction of expiredTransactions) {
      try {
        const seller = await User.findById(transaction.seller);
        if (seller && seller.jazzcashNumber && transaction.sellerAmount > 0) {
          const payoutResult = await paymentService.initiatePayout({
            amount: transaction.sellerAmount,
            mobileNumber: seller.jazzcashNumber,
            transactionId: transaction._id.toString(),
          });

          if (payoutResult.success) {
            transaction.escrowAutoReleased = true;
            transaction.payoutStatus = "completed";
            transaction.payoutTransactionId = payoutResult.payoutId;
            transaction.payoutCompletedAt = new Date();
            transaction.paymentStatus = "released";
            transaction.orderStatus = "completed";
            transaction.completedAt = new Date();
            await transaction.save();

            results.push({
              transactionId: transaction._id,
              status: "released",
            });
          } else {
            results.push({
              transactionId: transaction._id,
              status: "payout_failed",
              error: payoutResult.message,
            });
          }
        }
      } catch (err) {
        results.push({
          transactionId: transaction._id,
          status: "error",
          error: err.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${results.length} expired escrow transactions`,
      results,
    });
  } catch (error) {
    console.error("Auto-release escrow error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to auto-release escrow",
    });
  }
};
