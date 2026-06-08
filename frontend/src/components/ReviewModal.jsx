import { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";

export default function ReviewModal({ isOpen, onClose, onSubmit, transaction }) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sessionUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const currentUserId = sessionUser?._id || sessionUser?.id;
  const isBuyer = transaction?.buyer?._id?.toString() === currentUserId?.toString();
  const otherUser = isBuyer ? transaction?.seller : transaction?.buyer;

  const ratingLabels = {
    1: t("review.ratingPoor"),
    2: t("review.ratingFair"),
    3: t("review.ratingGood"),
    4: t("review.ratingVeryGood"),
    5: t("review.ratingExcellent"),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onSubmit(rating, comment);
      setRating(5);
      setComment("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl shadow-xl bg-white dark:bg-gray-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t("review.rateYourExperience")}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User being rated */}
          <div className="flex items-center gap-3 p-3 rounded-lg mb-6 bg-gray-50 dark:bg-gray-700">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
              {otherUser?.avatar ? (
                <img
                  src={otherUser.avatar}
                  alt={otherUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold text-lg">
                  {otherUser?.name?.charAt(0) || "?"}
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {otherUser?.name || "User"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isBuyer ? t("review.seller") : t("review.buyer")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Star Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t("review.rating")}
              </label>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 focus:outline-none transform transition-transform hover:scale-110"
                  >
                    <svg
                      className={`w-10 h-10 ${star <= (hoveredRating || rating)
                        ? "text-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                        }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <p className="text-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                {ratingLabels[rating]}
              </p>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {t("review.commentOptional")}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={t("review.commentPlaceholder")}
                className="w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-right text-xs mt-1 text-gray-400 dark:text-gray-500">
                {comment.length}/500
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? t("common.loading") : t("review.submitReview")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
