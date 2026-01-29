import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { paymentsAPI } from "../utils/api";
import chatAPI from "../utils/chatApi";
import socketService from "../utils/socket";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import MapLocationPicker from "../components/MapLocationPicker";
import { useTheme } from "../contexts/ThemeContext";
import {
  ShoppingBag,
  CreditCard,
  Truck,
  Phone,
  FileText,
  ArrowLeft,
  CheckCircle,
  Banknote,
  Smartphone,
  Package
} from "lucide-react";

export default function CreateTransaction() {
  const { isDark } = useTheme();
  const { listingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Get listing data from navigation state or fetch it
  const listing = location.state?.listing;

  const [formData, setFormData] = useState({
    amount: location.state?.offerAmount || listing?.price || "",
    quantity: 1,
    paymentMethod: "cod",
    deliveryAddress: "",
    deliveryNotes: "",
    buyerPhone: "",
    mobileNumber: "", // For JazzCash
    cnic: "", // For JazzCash (optional)
    deliveryLocation: null, // Map coordinates
  });

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    }
    fetchPaymentStatus();
    loadUnreadCount();

    // Listen for unread count updates
    socketService.onUnreadCountUpdated(async () => {
      await loadUnreadCount();
    });
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const fetchPaymentStatus = async () => {
    try {
      const response = await paymentsAPI.getStatus();
      setPaymentStatus(response.data);
      setPaymentMethods(response.data.availableMethods || ["cod"]);
    } catch (err) {
      console.error("Failed to fetch payment status:", err);
      setPaymentMethods(["cod"]);
    }
  };

  const handleLogout = async () => {
    try {
      const { authAPI } = await import("../utils/api");
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    sessionStorage.removeItem("user");
    socketService.disconnect();
    navigate("/signin");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Validate Pakistani phone number (03XXXXXXXXX format)
  const validatePhone = (phone) => {
    const phoneRegex = /^03[0-9]{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate delivery address
    if (!formData.deliveryAddress || formData.deliveryAddress.trim().length < 10) {
      setError("Please enter a valid delivery address (minimum 10 characters)");
      return;
    }

    // Validate phone number
    if (!formData.buyerPhone || !validatePhone(formData.buyerPhone)) {
      setError("Please enter a valid Pakistani phone number (03XXXXXXXXX)");
      return;
    }

    // Validate JazzCash mobile number if selected
    if (formData.paymentMethod === "jazzcash" && !validatePhone(formData.mobileNumber)) {
      setError("Please enter a valid JazzCash mobile number (03XXXXXXXXX)");
      return;
    }

    // Validate Quantity
    const qty = parseInt(formData.quantity);
    if (!qty || qty < 1) {
      setError("Please enter a valid quantity (minimum 1)");
      return;
    }
    if (qty > listing.quantity) {
      setError(`Quantity cannot exceed available stock (${listing.quantity})`);
      return;
    }

    setLoading(true);

    try {
      // Create transaction
      const transactionResponse = await paymentsAPI.createTransaction({
        listingId,
        amount: parseFloat(formData.amount),
        quantity: parseInt(formData.quantity),
        paymentMethod: formData.paymentMethod,
        deliveryAddress: formData.deliveryAddress,
        deliveryNotes: formData.deliveryNotes,
        deliveryLocation: formData.deliveryLocation,
        buyerPhone: formData.buyerPhone,
        conversationId: location.state?.conversationId,
      });

      const transactionId = transactionResponse.data._id;

      // Process payment
      const paymentData = {};
      if (formData.paymentMethod === "jazzcash") {
        paymentData.mobileNumber = formData.mobileNumber;
        paymentData.cnic = formData.cnic;
      }

      const paymentResponse = await paymentsAPI.processPayment(transactionId, paymentData);

      // Success - navigate to transactions
      navigate("/transactions", {
        state: {
          success: true,
          message: paymentResponse.message,
          demo: paymentResponse.demo,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = parseFloat(formData.amount || 0) * parseInt(formData.quantity || 1);

  if (!listing) {
    return (
      <div className={`min-h-screen pt-16 sm:pt-20 ${isDark ? "bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800" : "bg-gradient-to-br from-emerald-50 via-white to-teal-50"}`}>
        {user && <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />}
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className={`p-8 rounded-3xl ${isDark ? "bg-gray-800/50 backdrop-blur-xl border border-gray-700/50" : "bg-white/70 backdrop-blur-xl border border-gray-200/50"} shadow-2xl`}>
            <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
            <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Listing data not found. Please go back and try again.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="mt-6 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-16 sm:pt-20 ${isDark ? "bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800" : "bg-gradient-to-br from-emerald-50 via-white to-teal-50"}`}>
      {user && <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 mb-4 text-sm font-medium ${isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"} transition-colors`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to listing
          </button>
          <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            Complete Your Purchase
          </h1>
          <p className={`mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Review your order and enter delivery details
          </p>
        </div>

        {error && <ErrorMessage message={error} onClose={() => setError("")} />}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Listing Card */}
            <div className={`rounded-2xl overflow-hidden ${isDark ? "bg-gray-800/50 backdrop-blur-xl border border-gray-700/50" : "bg-white/70 backdrop-blur-xl border border-gray-200/50"} shadow-xl`}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag className={`w-5 h-5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                  <h2 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Order Summary</h2>
                </div>
                <div className="flex gap-5">
                  <div className="relative">
                    <img
                      src={listing.images?.[0] || "/placeholder.jpg"}
                      alt={listing.title}
                      className="w-28 h-28 object-cover rounded-xl shadow-lg"
                    />
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                      {formData.quantity}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                      {listing.title}
                    </h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                      {listing.category}
                    </span>
                    <p className="text-emerald-500 font-bold text-xl mt-3">
                      Rs. {listing.price?.toLocaleString()} <span className="text-sm font-normal opacity-70">/ {listing.unit}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Payment Method */}
              <div className={`rounded-2xl ${isDark ? "bg-gray-800/50 backdrop-blur-xl border border-gray-700/50" : "bg-white/70 backdrop-blur-xl border border-gray-200/50"} shadow-xl p-6`}>
                <div className="flex items-center gap-2 mb-5">
                  <CreditCard className={`w-5 h-5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                  <h2 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Payment Method</h2>
                </div>

                {/* Demo Mode Notice */}
                {paymentStatus?.jazzcash?.demo && formData.paymentMethod === "jazzcash" && (
                  <div className="mb-5 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium text-amber-600 dark:text-amber-400">Demo Mode Active</span>
                        <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                          No actual payment will be processed
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {paymentMethods.includes("cod") && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: "cod" }))}
                      className={`group relative p-5 rounded-xl border-2 transition-all duration-300 overflow-hidden ${formData.paymentMethod === "cod"
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-teal-500/10"
                        : isDark
                          ? "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                          : "border-gray-200 hover:border-gray-300 bg-white/50"
                        }`}
                    >
                      {formData.paymentMethod === "cod" && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                      )}
                      <div className="flex flex-col items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.paymentMethod === "cod"
                          ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white"
                          : isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"
                          }`}>
                          <Banknote className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                            Cash on Delivery
                          </p>
                          <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            Pay when you receive your order
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                  {paymentMethods.includes("jazzcash") && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: "jazzcash" }))}
                      className={`group relative p-5 rounded-xl border-2 transition-all duration-300 overflow-hidden ${formData.paymentMethod === "jazzcash"
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-teal-500/10"
                        : isDark
                          ? "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                          : "border-gray-200 hover:border-gray-300 bg-white/50"
                        }`}
                    >
                      {formData.paymentMethod === "jazzcash" && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                      )}
                      <div className="flex flex-col items-start gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
                          <img
                            src="/images/jazzcash-logo.png"
                            alt="JazzCash"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-left">
                          <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                            JazzCash
                          </p>
                          <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            Pay via mobile wallet
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* JazzCash Fields */}
                {formData.paymentMethod === "jazzcash" && (
                  <div className="mt-5 space-y-4 p-5 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/20">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        JazzCash Mobile Number *
                      </label>
                      <input
                        type="tel"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        placeholder="03XXXXXXXXX"
                        required
                        pattern="03[0-9]{9}"
                        maxLength={11}
                        className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-300 ${isDark
                          ? "bg-gray-800/50 border-gray-700 text-white focus:border-emerald-500 focus:bg-gray-800"
                          : "bg-white border-gray-200 text-gray-900 focus:border-emerald-500"
                          } focus:ring-4 focus:ring-emerald-500/20 outline-none`}
                      />
                      <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        Format: 03XXXXXXXXX (11 digits)
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        CNIC (Last 6 digits) - Optional
                      </label>
                      <input
                        type="text"
                        name="cnic"
                        value={formData.cnic}
                        onChange={handleChange}
                        placeholder="XXXXXX"
                        maxLength={6}
                        className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-300 ${isDark
                          ? "bg-gray-800/50 border-gray-700 text-white focus:border-emerald-500 focus:bg-gray-800"
                          : "bg-white border-gray-200 text-gray-900 focus:border-emerald-500"
                          } focus:ring-4 focus:ring-emerald-500/20 outline-none`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Information */}
              <div className={`rounded-2xl ${isDark ? "bg-gray-800/50 backdrop-blur-xl border border-gray-700/50" : "bg-white/70 backdrop-blur-xl border border-gray-200/50"} shadow-xl p-6`}>
                <div className="flex items-center gap-2 mb-5">
                  <Truck className={`w-5 h-5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                  <h2 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Delivery Information</h2>
                </div>

                <div className="space-y-5">
                  {/* Quantity & Amount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        min="1"
                        max={listing.quantity}
                        className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-300 ${isDark
                          ? "bg-gray-800/50 border-gray-700 text-white focus:border-emerald-500 focus:bg-gray-800"
                          : "bg-white border-gray-200 text-gray-900 focus:border-emerald-500"
                          } focus:ring-4 focus:ring-emerald-500/20 outline-none`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Amount (Rs.)
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        min="1"
                        className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-300 ${isDark
                          ? "bg-gray-800/50 border-gray-700 text-white focus:border-emerald-500 focus:bg-gray-800"
                          : "bg-white border-gray-200 text-gray-900 focus:border-emerald-500"
                          } focus:ring-4 focus:ring-emerald-500/20 outline-none`}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      <Phone className="w-4 h-4" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="buyerPhone"
                      value={formData.buyerPhone}
                      onChange={handleChange}
                      required
                      pattern="03[0-9]{9}"
                      maxLength={11}
                      placeholder="03XXXXXXXXX"
                      className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-300 ${isDark
                        ? "bg-gray-800/50 border-gray-700 text-white focus:border-emerald-500 focus:bg-gray-800"
                        : "bg-white border-gray-200 text-gray-900 focus:border-emerald-500"
                        } focus:ring-4 focus:ring-emerald-500/20 outline-none`}
                    />
                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      Format: 03XXXXXXXXX (11 digits)
                    </p>
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      <Truck className="w-4 h-4" />
                      Delivery Address *
                    </label>
                    <textarea
                      name="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={handleChange}
                      required
                      minLength={10}
                      rows={2}
                      placeholder="Enter your complete delivery address (House #, Street, Area, City)"
                      className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-300 resize-none ${isDark
                        ? "bg-gray-800/50 border-gray-700 text-white focus:border-emerald-500 focus:bg-gray-800"
                        : "bg-white border-gray-200 text-gray-900 focus:border-emerald-500"
                        } focus:ring-4 focus:ring-emerald-500/20 outline-none`}
                    />
                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      Include house/shop number, street, area and city
                    </p>
                  </div>

                  {/* Map Location Picker */}
                  <div className={`p-4 rounded-xl ${isDark ? "bg-gray-900/50" : "bg-gray-50"}`}>
                    <MapLocationPicker
                      onLocationSelect={(location) =>
                        setFormData((prev) => ({
                          ...prev,
                          deliveryLocation: location,
                          deliveryAddress: location.address || prev.deliveryAddress,
                        }))
                      }
                    />
                  </div>

                  {/* Delivery Notes */}
                  <div>
                    <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      <FileText className="w-4 h-4" />
                      Delivery Notes (Optional)
                    </label>
                    <textarea
                      name="deliveryNotes"
                      value={formData.deliveryNotes}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Any special instructions for delivery"
                      className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-300 resize-none ${isDark
                        ? "bg-gray-800/50 border-gray-700 text-white focus:border-emerald-500 focus:bg-gray-800"
                        : "bg-white border-gray-200 text-gray-900 focus:border-emerald-500"
                        } focus:ring-4 focus:ring-emerald-500/20 outline-none`}
                    />
                  </div>
                </div>
              </div>

              {/* Validation Error Display */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </p>
                </div>
              )}

              {/* Mobile Submit Button (shown only on mobile) */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size="sm" />
                      Processing...
                    </span>
                  ) : formData.paymentMethod === "cod" ? (
                    `Place Order • Rs. ${totalAmount.toLocaleString()}`
                  ) : (
                    `Pay Rs. ${totalAmount.toLocaleString()} with JazzCash`
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary Sidebar - Right Side */}
          <div className="lg:col-span-1">
            <div className={`sticky top-24 rounded-2xl ${isDark ? "bg-gray-800/50 backdrop-blur-xl border border-gray-700/50" : "bg-white/70 backdrop-blur-xl border border-gray-200/50"} shadow-xl p-6`}>
              <h3 className={`font-semibold text-lg mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>
                Order Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className={isDark ? "text-gray-400" : "text-gray-600"}>Subtotal</span>
                  <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    Rs. {formData.amount ? parseFloat(formData.amount).toLocaleString() : "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? "text-gray-400" : "text-gray-600"}>Quantity</span>
                  <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    × {formData.quantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? "text-gray-400" : "text-gray-600"}>Delivery</span>
                  <span className="font-medium text-emerald-500">Free</span>
                </div>

                <div className={`border-t ${isDark ? "border-gray-700" : "border-gray-200"} pt-4 mt-4`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Total</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                      Rs. {totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop Validation Error */}
              {error && (
                <div className="hidden lg:block mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-red-600 dark:text-red-400 text-xs font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Desktop Submit Button */}
              <button
                type="submit"
                form="checkout-form"
                onClick={handleSubmit}
                disabled={loading}
                className="hidden lg:block w-full mt-4 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader size="sm" />
                    Processing...
                  </span>
                ) : formData.paymentMethod === "cod" ? (
                  "Place Order"
                ) : (
                  "Pay with JazzCash"
                )}
              </button>

              {/* Trust badges */}
              <div className="mt-6 pt-5 border-t border-gray-700/50">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
