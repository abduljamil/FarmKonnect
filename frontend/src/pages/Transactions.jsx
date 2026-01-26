import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { paymentsAPI, reviewsAPI, authAPI } from "../utils/api";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import ReviewModal from "../components/ReviewModal";
import ConfirmModal from "../components/ConfirmModal";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationContext";
import useUserSync from "../hooks/useUserSync";
import socketService from "../utils/socket";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delivered: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  disputed: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const paymentStatusColors = {
  pending: "text-yellow-600 dark:text-yellow-400",
  paid: "text-green-600 dark:text-green-400",
  released: "text-blue-600 dark:text-blue-400",
  failed: "text-red-600 dark:text-red-400",
  refunded: "text-purple-600 dark:text-purple-400",
  cancelled: "text-gray-600 dark:text-gray-400",
};

export default function Transactions() {
  const { isDark } = useTheme();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem("user") || "{}"));
  const [unreadCount, setUnreadCount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [actionLoading, setActionLoading] = useState(null);
  const [reviewModal, setReviewModal] = useState({ open: false, transaction: null });
  const [cancelModal, setCancelModal] = useState({ open: false, transactionId: null });
  const currentUserId = user?._id || user?.id;

  useUserSync(user, setUser, navigate);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      sessionStorage.removeItem("user");
      navigate("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    fetchTransactions();

  }, [filter, roleFilter, pagination.current]);

  // Real-time updates
  useEffect(() => {
    // Ensure socket is connected before setting up listeners
    const userData = sessionStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.token) {
          socketService.connect(parsedUser.token);
        }
      } catch (e) {
        console.error("Error parsing user data for socket:", e);
      }
    }

    const handleStatusUpdate = (update) => {
      // Fetch fresh data from server to get all updated fields
      fetchTransactions(false);
    };

    const handleNewOrder = (order) => {
      fetchTransactions(false);
    };

    socketService.onOrderStatusUpdate(handleStatusUpdate, "transactions_list");
    socketService.onNewOrder(handleNewOrder);

    // Polling fallback - refresh every 10 seconds to catch missed socket updates
    const pollInterval = setInterval(() => {
      fetchTransactions(false);
    }, 10000);

    return () => {
      socketService.offOrderStatusUpdate("transactions_list");
      socketService.offNewOrder();
      clearInterval(pollInterval);
    };
  }, []);

  const fetchTransactions = async (showLoading = true) => {
    try {
      // Only show loading if explicitly requested and no data exists yet
      if (showLoading && transactions.length === 0) {
        setLoading(true);
      }
      const params = {
        page: pagination.current,
        limit: 10,
      };
      if (filter !== "all") params.status = filter;
      if (roleFilter !== "all") params.role = roleFilter;

      const response = await paymentsAPI.getMyTransactions(params);
      setTransactions(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async (transactionId) => {
    try {
      setActionLoading(transactionId);
      await paymentsAPI.markDelivered(transactionId);
      await fetchTransactions(false); // Don't show loading to prevent UI flicker
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmOrder = async (transactionId) => {
    try {
      setActionLoading(transactionId);
      await paymentsAPI.confirmOrder(transactionId);
      await fetchTransactions(false); // Don't show loading to prevent UI flicker
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (transactionId) => {
    try {
      setActionLoading(transactionId);
      await paymentsAPI.completeTransaction(transactionId);
      await fetchTransactions(false); // Don't show loading to prevent UI flicker
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openCancelModal = (transactionId) => {
    setCancelModal({ open: true, transactionId });
  };

  const closeCancelModal = () => {
    setCancelModal({ open: false, transactionId: null });
  };

  const handleCancel = async () => {
    const transactionId = cancelModal.transactionId;
    if (!transactionId) return;

    closeCancelModal();

    try {
      setActionLoading(transactionId);
      await paymentsAPI.cancelTransaction(transactionId, "Cancelled by user");
      await fetchTransactions(false); // Don't show loading to prevent UI flicker
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openReviewModal = async (transaction) => {
    try {
      const response = await reviewsAPI.canReview(transaction._id);
      if (response.data.canReview) {
        setReviewModal({ open: true, transaction });
      } else {
        addNotification(response.data.reason || "Cannot review this transaction", "warning");
      }
    } catch (err) {
      addNotification(err.message, "error");
    }
  };

  const handleReviewSubmit = async (rating, comment) => {
    try {
      await reviewsAPI.createReview({
        transactionId: reviewModal.transaction._id,
        rating,
        comment,
      });
      setReviewModal({ open: false, transaction: null });
      addNotification("Review submitted successfully!", "success");
      fetchTransactions();
    } catch (err) {
      addNotification(err.message || "Failed to submit review", "error");
      throw err;
    }
  };

  const userId = user?._id || user?.id;
  const isBuyer = (transaction) => transaction?.buyer?._id?.toString() === userId?.toString();
  const isSeller = (transaction) => transaction?.seller?._id?.toString() === userId?.toString();
  const canRate = (transaction) => {
    if (transaction.orderStatus !== "completed") return false;
    return isBuyer(transaction) ? !transaction.buyerHasRated : !transaction.sellerHasRated;
  };

  if (loading && transactions.length === 0) {
    return (
      <div className={`min-h-screen ${isDark ? "dark bg-gray-900" : "bg-gray-50"} pt-16 sm:pt-20`}>
        <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
        <div className="flex justify-center items-center h-[60vh]">
          <Loader size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "dark bg-gray-900" : "bg-gray-50"} pt-16 sm:pt-20`}>
      <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            My Transactions
          </h1>

          <div className="flex gap-3">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
              className={`min-w-[130px] px-3 py-2 pr-10 rounded-lg text-sm border appearance-none cursor-pointer shadow-sm ${isDark
                ? "bg-gray-800 border-gray-700 text-gray-200"
                : "bg-white border-gray-300 text-gray-700"
                }`}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat' }}
            >
              <option value="all" className="bg-white dark:bg-gray-800">All Roles</option>
              <option value="buyer" className="bg-white dark:bg-gray-800">As Buyer</option>
              <option value="seller" className="bg-white dark:bg-gray-800">As Seller</option>
            </select>

            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
              className={`min-w-[130px] px-3 py-2 pr-10 rounded-lg text-sm border appearance-none cursor-pointer shadow-sm ${isDark
                ? "bg-gray-800 border-gray-700 text-gray-200"
                : "bg-white border-gray-300 text-gray-700"
                }`}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat' }}
            >
              <option value="all" className="bg-white dark:bg-gray-800">All Status</option>
              <option value="pending" className="bg-white dark:bg-gray-800">Pending</option>
              <option value="confirmed" className="bg-white dark:bg-gray-800">Confirmed</option>
              <option value="delivered" className="bg-white dark:bg-gray-800">Delivered</option>
              <option value="completed" className="bg-white dark:bg-gray-800">Completed</option>
              <option value="cancelled" className="bg-white dark:bg-gray-800">Cancelled</option>
            </select>
          </div>
        </div>

        {error && <ErrorMessage message={error} onClose={() => setError("")} />}

        {transactions.length === 0 ? (
          <div className={`text-center py-12 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow`}>
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
              No transactions found
            </p>
            <Link
              to="/listings"
              className="inline-block mt-4 text-green-600 hover:text-green-700 font-medium"
            >
              Browse Marketplace →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction, index) => transaction && (
              <div
                key={transaction._id || index}
                className={`rounded-xl shadow overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"
                  }`}
              >
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Image */}
                    <div className="w-full sm:w-32 h-32 flex-shrink-0">
                      <img
                        src={transaction.listing?.images?.[0] || "/placeholder.jpg"}
                        alt={transaction.listing?.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>

                    {/* Meta info & actions */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                            {transaction.listing?.title || "Listing unavailable"}
                          </h3>
                          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {isBuyer(transaction) ? (
                              <>Seller: <span className="font-medium">{transaction.seller?.name || "Unknown"}</span></>
                            ) : (
                              <>Buyer: <span className="font-medium">{transaction.buyer?.name || "Unknown"}</span></>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                            Rs. {transaction.amount?.toLocaleString() || 0}
                          </p>
                          <p className={`text-sm capitalize ${paymentStatusColors[transaction.paymentStatus] || "text-gray-500"}`}>
                            {transaction.paymentMethod === "cod" ? "Cash on Delivery" : (transaction.paymentMethod || "N/A")}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[transaction.orderStatus] || "bg-gray-100 text-gray-800"}`}>
                          {transaction.orderStatus || "unknown"}
                        </span>
                        {transaction.createdAt && (
                          <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {isBuyer(transaction) && (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-400">
                            Buying
                          </span>
                        )}
                        {isSeller(transaction) && (
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs dark:bg-purple-900/30 dark:text-purple-400">
                            Selling
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {/* Seller: Confirm Order */}
                        {isSeller(transaction) && transaction.orderStatus === "pending" && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleConfirmOrder(transaction._id);
                            }}
                            disabled={actionLoading === transaction._id}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            {actionLoading === transaction._id ? "Loading..." : "Confirm Order"}
                          </button>
                        )}
                        {/* Seller: Mark as Delivered - redirect to details page for proof upload */}
                        {isSeller(transaction) && transaction.orderStatus === "confirmed" && (
                          <Link
                            to={`/transactions/${transaction._id}`}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 inline-block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📦 Mark Delivered →
                          </Link>
                        )}

                        {/* Seller: COD Payment Confirmation */}
                        {isSeller(transaction) && transaction.paymentMethod === "cod" && transaction.orderStatus === "delivered" && (
                          transaction.buyerConfirmedPayment && !transaction.sellerConfirmedPayment ? (
                            // Buyer confirmed payment, seller needs to confirm
                            <Link
                              to={`/transactions/${transaction._id}`}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 inline-block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              💵 Confirm Payment Received →
                            </Link>
                          ) : !transaction.buyerConfirmedPayment && (
                            // Waiting for buyer
                            <span className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400">
                              ⏳ Waiting for buyer to pay
                            </span>
                          )
                        )}

                        {/* Buyer: Confirm Delivery */}
                        {isBuyer(transaction) && transaction.orderStatus === "delivered" && (
                          transaction.paymentMethod === "cod" ? (
                            // COD transactions: redirect to details page for multi-step flow
                            <Link
                              to={`/transactions/${transaction._id}`}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 inline-block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Complete COD Payment →
                            </Link>
                          ) : (
                            // Non-COD transactions: direct complete
                            <button
                              onClick={() => handleComplete(transaction._id)}
                              disabled={actionLoading === transaction._id}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              {actionLoading === transaction._id ? "Loading..." : "Confirm Received"}
                            </button>
                          )
                        )}

                        {/* Rate button for completed transactions */}
                        {canRate(transaction) && (
                          <button
                            onClick={() => openReviewModal(transaction)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600"
                          >
                            ⭐ Rate {isBuyer(transaction) ? "Seller" : "Buyer"}
                          </button>
                        )}

                        {/* Cancel (only for pending/confirmed) */}
                        {["pending", "confirmed"].includes(transaction.orderStatus) && (
                          <button
                            onClick={() => openCancelModal(transaction._id)}
                            disabled={actionLoading === transaction._id}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark
                              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              } disabled:opacity-50`}
                          >
                            Cancel
                          </button>
                        )}

                        {/* View Details */}
                        <Link
                          to={`/transactions/${transaction._id}`}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark
                            ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
              disabled={pagination.current === 1}
              className={`px-4 py-2 rounded-lg ${isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700"
                } disabled:opacity-50`}
            >
              Previous
            </button>
            <span className={`px-4 py-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Page {pagination.current} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
              disabled={pagination.current === pagination.pages}
              className={`px-4 py-2 rounded-lg ${isDark ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700"
                } disabled:opacity-50`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModal.open}
        onClose={() => setReviewModal({ open: false, transaction: null })}
        onSubmit={handleReviewSubmit}
        transaction={reviewModal.transaction}
        isDark={isDark}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={cancelModal.open}
        onClose={closeCancelModal}
        onConfirm={handleCancel}
        title="Cancel Transaction"
        message="Are you sure you want to cancel this transaction? This action cannot be undone."
        confirmText="Cancel Transaction"
        variant="warning"
      />
    </div>
  );
}
