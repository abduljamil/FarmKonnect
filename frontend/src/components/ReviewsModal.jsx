import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, Star, ExternalLink } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { reviewsAPI } from "../utils/api";
import Loader from "./Loader";

export default function ReviewsModal({ isOpen, onClose, userId, userName }) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [distribution, setDistribution] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [pagination, setPagination] = useState({ page: 1, hasMore: false });

  useEffect(() => {
    if (isOpen && userId) {
      setReviews([]);
      setPagination({ page: 1, hasMore: false });
      fetchReviews(1);
    }
  }, [isOpen, userId, fetchReviews]);

  const fetchReviews = useCallback(async (page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await reviewsAPI.getUserReviews(userId, { page, limit: 5 });

      if (page === 1) {
        setReviews(response.data.reviews);
        setUserInfo(response.data.user);
        setDistribution(response.data.distribution);
      } else {
        setReviews(prev => [...prev, ...response.data.reviews]);
      }

      setPagination({
        page,
        hasMore: page * 5 < response.pagination.total
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  const loadMore = () => {
    fetchReviews(pagination.page + 1);
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-gray-600"
          }`}
      />
    ));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-2xl h-[90vh] flex flex-col rounded-2xl shadow-2xl ${isDark ? "bg-gray-800" : "bg-white"
          }`}
      >
        {/* Header */}
        <div className={`flex-shrink-0 px-6 py-4 border-b ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Reviews for {userInfo?.name || userName}
              </h2>
              {userInfo && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    {renderStars(Math.round(userInfo.rating?.average || 0))}
                  </div>
                  <span className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {userInfo.rating?.average?.toFixed(1) || "0.0"}
                  </span>
                  <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    ({userInfo.rating?.count || 0} {userInfo.rating?.count === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${isDark
                ? "hover:bg-gray-700 text-gray-400 hover:text-white"
                : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Rating Distribution */}
          {userInfo && userInfo.rating?.count > 0 && (
            <div className="mt-4 space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className={`text-sm w-8 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {stars} ★
                  </span>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                    <div
                      className="h-full bg-yellow-400 transition-all duration-300"
                      style={{
                        width: `${userInfo.rating?.count > 0 ? (distribution[stars] / userInfo.rating.count) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className={`text-sm w-8 text-right ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {distribution[stars]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews List */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8 min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
                No reviews yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  onClick={() => {
                    if (review.transaction?._id) {
                      onClose();
                      navigate(`/orders/${review.transaction._id}`);
                    }
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${isDark
                    ? "bg-gray-700/50 border-gray-600 hover:bg-gray-700 hover:border-gray-500"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Reviewer Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {review.reviewer?.avatar ? (
                        <img
                          src={review.reviewer.avatar}
                          alt={review.reviewer.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        review.reviewer?.name?.charAt(0)?.toUpperCase() || "U"
                      )}
                    </div>

                    {/* Review Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {review.reviewer?.name || "Anonymous"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              {renderStars(review.rating)}
                            </div>
                            <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                        </div>
                        {review.transaction?._id && (
                          <ExternalLink className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                        )}
                      </div>
                      {review.transaction?.listing?.title && (
                        <p className={`text-xs mb-1 ${isDark ? "text-primary-400" : "text-primary-600"}`}>
                          Order: {review.transaction.listing.title}
                        </p>
                      )}
                      {review.comment && (
                        <p className={`text-sm mt-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {!loading && pagination.hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${isDark
                  ? "bg-primary-600 hover:bg-primary-700 text-white"
                  : "bg-primary-500 hover:bg-primary-600 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  "Load More Reviews"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
