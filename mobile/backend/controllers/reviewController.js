const Review = require("../models/Review");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// @desc    Create a review after completed transaction
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { transactionId, rating, comment } = req.body;

    // Validate input
    if (!transactionId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Find transaction
    const transaction = await Transaction.findById(transactionId)
      .populate("buyer", "name")
      .populate("seller", "name");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Check transaction is completed
    if (transaction.orderStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Can only review after transaction is completed",
      });
    }

    // Determine if user is buyer or seller
    const isBuyer = transaction.buyer._id.toString() === req.user._id.toString();
    const isSeller = transaction.seller._id.toString() === req.user._id.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: "Only transaction participants can leave reviews",
      });
    }

    // Check if already reviewed
    const reviewType = isBuyer ? "buyer_to_seller" : "seller_to_buyer";
    const reviewedUser = isBuyer ? transaction.seller._id : transaction.buyer._id;

    // Check for existing review
    const existingReview = await Review.findOne({
      reviewer: req.user._id,
      transaction: transactionId,
      reviewType,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this transaction",
      });
    }

    // Create review
    const review = await Review.create({
      reviewer: req.user._id,
      reviewedUser,
      transaction: transactionId,
      rating,
      comment: comment || "",
      reviewType,
    });

    // Update transaction rating flags
    if (isBuyer) {
      transaction.buyerHasRated = true;
    } else {
      transaction.sellerHasRated = true;
    }
    await transaction.save();

    // Populate for response
    await review.populate([
      { path: "reviewer", select: "name avatar" },
      { path: "reviewedUser", select: "name avatar rating" },
    ]);

    // Emit socket notification to the reviewed user
    const io = req.io;
    if (io) {
      const listingInfo = await Transaction.findById(transactionId).populate("listing", "title");
      io.to(`user:${reviewedUser}`).emit("newReview", {
        reviewId: review._id,
        reviewerName: req.user.name,
        rating: rating,
        comment: comment || "",
        listingTitle: listingInfo?.listing?.title || "an order",
        message: `${req.user.name} gave you a ${rating}-star review!`,
        createdAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (error) {
    console.error("Create review error:", error);
    
    // Handle duplicate review error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this transaction",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit review",
    });
  }
};

// @desc    Get reviews for a user
// @route   GET /api/reviews/user/:userId
// @access  Public
exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate user exists
    const user = await User.findById(userId).select("name avatar rating");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ reviewedUser: userId })
      .populate("reviewer", "name avatar")
      .populate({
        path: "transaction",
        select: "_id listing",
        populate: {
          path: "listing",
          select: "title"
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ reviewedUser: userId });

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { reviewedUser: user._id } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingDistribution.forEach((r) => {
      distribution[r._id] = r.count;
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
          rating: user.rating,
        },
        reviews,
        distribution,
      },
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Get user reviews error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
};

// @desc    Get my reviews (reviews I've written)
// @route   GET /api/reviews/my-reviews
// @access  Private
exports.getMyReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ reviewer: req.user._id })
      .populate("reviewedUser", "name avatar")
      .populate("transaction", "amount listing")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ reviewer: req.user._id });

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Get my reviews error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
};

// @desc    Check if user can review a transaction
// @route   GET /api/reviews/can-review/:transactionId
// @access  Private
exports.canReviewTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const isBuyer = transaction.buyer.toString() === req.user._id.toString();
    const isSeller = transaction.seller.toString() === req.user._id.toString();

    if (!isBuyer && !isSeller) {
      return res.status(200).json({
        success: true,
        data: {
          canReview: false,
          reason: "Not a participant in this transaction",
        },
      });
    }

    if (transaction.orderStatus !== "completed") {
      return res.status(200).json({
        success: true,
        data: {
          canReview: false,
          reason: "Transaction is not completed yet",
        },
      });
    }

    // Check if already reviewed
    const hasReviewed = isBuyer ? transaction.buyerHasRated : transaction.sellerHasRated;

    res.status(200).json({
      success: true,
      data: {
        canReview: !hasReviewed,
        hasReviewed,
        role: isBuyer ? "buyer" : "seller",
        reason: hasReviewed ? "Already reviewed" : null,
      },
    });
  } catch (error) {
    console.error("Can review check error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check review status",
    });
  }
};

// @desc    Delete a review (admin only)
// @route   DELETE /api/reviews/:id
// @access  Private (Admin)
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Only admin can delete reviews
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete reviews",
      });
    }

    const reviewedUserId = review.reviewedUser;

    await review.deleteOne();

    // Recalculate user rating
    const stats = await Review.aggregate([
      { $match: { reviewedUser: reviewedUserId } },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    const newRating = stats.length > 0
      ? { average: Math.round(stats[0].average * 10) / 10, count: stats[0].count }
      : { average: 0, count: 0 };

    await User.findByIdAndUpdate(reviewedUserId, { rating: newRating });

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete review",
    });
  }
};
