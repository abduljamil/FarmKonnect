const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  // Who is giving the review
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Who is being reviewed
  reviewedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // The transaction this review is for
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
    required: true,
  },
  // Rating 1-5 stars
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  // Optional comment
  comment: {
    type: String,
    maxlength: 500,
    trim: true,
  },
  // Review type (who is reviewing whom)
  reviewType: {
    type: String,
    enum: ["buyer_to_seller", "seller_to_buyer"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure one review per user per transaction per type
reviewSchema.index(
  { reviewer: 1, transaction: 1, reviewType: 1 },
  { unique: true }
);

// Index for fetching user reviews
reviewSchema.index({ reviewedUser: 1, createdAt: -1 });

// Static method to calculate user's average rating
reviewSchema.statics.calculateAverageRating = async function (userId) {
  const result = await this.aggregate([
    { $match: { reviewedUser: userId } },
    {
      $group: {
        _id: "$reviewedUser",
        averageRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    return {
      average: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
      count: result[0].count,
    };
  }

  return { average: 0, count: 0 };
};

// After saving a review, update the user's rating
reviewSchema.post("save", async function () {
  const Review = this.constructor;
  const User = mongoose.model("User");

  const rating = await Review.calculateAverageRating(this.reviewedUser);

  await User.findByIdAndUpdate(this.reviewedUser, {
    "rating.average": rating.average,
    "rating.count": rating.count,
  });
});

// After deleting a review, recalculate the user's rating
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const Review = mongoose.model("Review");
    const User = mongoose.model("User");

    const rating = await Review.calculateAverageRating(doc.reviewedUser);

    await User.findByIdAndUpdate(doc.reviewedUser, {
      "rating.average": rating.average,
      "rating.count": rating.count,
    });
  }
});

module.exports = mongoose.model("Review", reviewSchema);
