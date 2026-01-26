const { runScraper, getScraperStatus } = require("../services/scraperService");
const Transaction = require("../models/Transaction");
const { deleteImage, getPublicIdFromUrl } = require("../config/cloudinary");

exports.triggerScraper = async (req, res) => {
  try {
    const result = runScraper();

    if (!result.started && result.status === "running") {
      return res.status(409).json({
        success: false,
        message: result.message,
        data: getScraperStatus(),
      });
    }

    return res.status(202).json({
      success: true,
      message: result.message,
      data: {
        ...getScraperStatus(),
        pid: result.pid,
        startedAt: result.startedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to start scraper",
    });
  }
};

exports.getScraperStatus = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: getScraperStatus(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get scraper status",
    });
  }
};

// Transaction Management
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('listing', 'title price')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transactions",
    });
  }
};

exports.updateTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, orderStatus } = req.body;

    const transaction = await Transaction.findById(id)
      .populate('listing', 'title')
      .populate('buyer', 'name')
      .populate('seller', 'name');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const wasNotPaid = transaction.paymentStatus !== "paid";
    const isNowPaid = paymentStatus === "paid";

    if (paymentStatus) {
      transaction.paymentStatus = paymentStatus;
      if (paymentStatus === "paid" && !transaction.paidAt) {
        transaction.paidAt = new Date();
      }
    }
    if (orderStatus) {
      transaction.orderStatus = orderStatus;
      if (orderStatus === "confirmed" && !transaction.confirmedAt) {
        transaction.confirmedAt = new Date();
      }
    }

    await transaction.save();

    // Notify seller when payment is marked as paid
    if (wasNotPaid && isNowPaid) {
      const io = req.app.get("io");
      if (io) {
        // Notify seller about payment received
        io.to(`user:${transaction.seller._id || transaction.seller}`).emit("orderStatusUpdate", {
          transactionId: transaction._id,
          listingTitle: transaction.listing?.title,
          buyerName: transaction.buyer?.name,
          newStatus: "paid",
          message: `Payment confirmed for ${transaction.listing?.title || 'your listing'}!`,
          createdAt: new Date(),
        });
        
        // Also notify buyer about confirmed payment
        io.to(`user:${transaction.buyer._id || transaction.buyer}`).emit("orderStatusUpdate", {
          transactionId: transaction._id,
          listingTitle: transaction.listing?.title,
          sellerName: transaction.seller?.name,
          newStatus: "paid",
          message: "Your payment has been confirmed!",
          createdAt: new Date(),
        });
      }
    }

    // Notify seller when payment is released
    const wasNotReleased = transaction.paymentStatus !== "released";
    const isNowReleased = paymentStatus === "released";
    if (wasNotReleased && isNowReleased) {
      const io = req.io;
      if (io) {
        io.to(`user:${transaction.seller._id || transaction.seller}`).emit("orderStatusUpdate", {
          transactionId: transaction._id,
          listingTitle: transaction.listing?.title,
          buyerName: transaction.buyer?.name,
          newStatus: "released",
          message: `💰 Payment of Rs. ${transaction.sellerAmount?.toLocaleString() || transaction.amount?.toLocaleString()} has been released to your account!`,
          createdAt: new Date(),
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: transaction,
      message: "Transaction status updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update transaction status",
    });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // First fetch the transaction to get delivery proof images
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Delete delivery proof images from Cloudinary if they exist
    if (transaction.deliveryProofImages && transaction.deliveryProofImages.length > 0) {
      for (const imageUrl of transaction.deliveryProofImages) {
        try {
          const publicId = getPublicIdFromUrl(imageUrl);
          if (publicId) {
            await deleteImage(publicId);
          }
        } catch (imgError) {
          console.error("Error deleting delivery proof image:", imgError);
          // Continue with other images even if one fails
        }
      }
    }

    // Now delete the transaction
    await Transaction.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete transaction",
    });
  }
};

// @desc    Resolve a dispute
// @route   PUT /api/admin/transactions/:id/resolve-dispute
// @access  Admin only
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, newOrderStatus, newPaymentStatus } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: "Resolution description is required",
      });
    }

    const transaction = await Transaction.findById(id)
      .populate('listing', 'title')
      .populate('buyer', 'name')
      .populate('seller', 'name');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.orderStatus !== "disputed") {
      return res.status(400).json({
        success: false,
        message: "Transaction is not in disputed status",
      });
    }

    // Update dispute resolution
    transaction.disputeResolvedAt = new Date();
    transaction.disputeResolution = resolution;
    
    // Update statuses if provided
    if (newOrderStatus) {
      transaction.orderStatus = newOrderStatus;
      if (newOrderStatus === "completed" && !transaction.completedAt) {
        transaction.completedAt = new Date();
      }
    }
    
    if (newPaymentStatus) {
      transaction.paymentStatus = newPaymentStatus;
      if (newPaymentStatus === "paid" && !transaction.paidAt) {
        transaction.paidAt = new Date();
      }
      if (newPaymentStatus === "refunded") {
        // Handle refund logic here if needed
      }
    }

    await transaction.save();

    // Notify both parties
    const io = req.app.get("io");
    if (io) {
      const notificationData = {
        transactionId: transaction._id,
        listingTitle: transaction.listing?.title,
        newStatus: "dispute_resolved",
        resolution: resolution,
        newOrderStatus: newOrderStatus,
        newPaymentStatus: newPaymentStatus,
        message: `✅ Dispute resolved: ${resolution}`,
        createdAt: new Date(),
      };

      // Notify buyer
      io.to(`user:${transaction.buyer._id || transaction.buyer}`).emit("orderStatusUpdate", {
        ...notificationData,
        sellerName: transaction.seller?.name,
      });

      // Notify seller
      io.to(`user:${transaction.seller._id || transaction.seller}`).emit("orderStatusUpdate", {
        ...notificationData,
        buyerName: transaction.buyer?.name,
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction,
      message: "Dispute resolved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to resolve dispute",
    });
  }
};
