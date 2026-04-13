const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/auth");
const {
  createReview,
  getUserReviews,
  getMyReviews,
  canReviewTransaction,
  deleteReview,
} = require("../controllers/reviewController");

// Public routes
router.get("/user/:userId", getUserReviews);

// Protected routes
router.use(protect);

router.post("/", createReview);
router.get("/my-reviews", getMyReviews);
router.get("/can-review/:transactionId", canReviewTransaction);

// Admin only
router.delete("/:id", isAdmin, deleteReview);

module.exports = router;
