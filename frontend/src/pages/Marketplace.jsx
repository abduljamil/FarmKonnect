import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config";
import { Search, Filter, Plus, MapPin, User, Package, X, MessageCircle, Edit2, Trash2, Eye, EyeOff, Clock, CheckCircle, ShieldCheck, TrendingUp, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import ImageCarousel from "../components/ImageCarousel";
import UserRating from "../components/UserRating";
import ReviewsModal from "../components/ReviewsModal";
import ConfirmModal from "../components/ConfirmModal";
import chatAPI from "../utils/chatApi";
import useUserSync from "../hooks/useUserSync";
import { useLanguage } from "../contexts/LanguageContext";

const Products = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toggling, setToggling] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // all, my-listings, create
  const [showFilters, setShowFilters] = useState(false); // Mobile filter toggle
  const [reviewsModal, setReviewsModal] = useState({ isOpen: false, userId: null, userName: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null });
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState({
    category: "",
    search: "",
    minPrice: "",
    maxPrice: "",
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });

  // Auto-sync user data (role updates)
  useUserSync(user, setUser, navigate);

  const fetchProducts = React.useCallback(async (page = pagination.page) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filter.category) queryParams.append("category", filter.category);
      if (filter.search) queryParams.append("search", filter.search);
      if (filter.minPrice) queryParams.append("minPrice", filter.minPrice);
      if (filter.maxPrice) queryParams.append("maxPrice", filter.maxPrice);
      queryParams.append("page", page);
      queryParams.append("limit", pagination.limit);

      let endpoint = `${API_URL}/listings`;
      if (activeTab === "my-listings") {
        endpoint = `${API_URL}/listings/my/listings`;
      }

      const response = await fetch(
        `${endpoint}?${queryParams.toString()}`,
        { credentials: "include" }
      );
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [filter, activeTab, pagination.limit, pagination.page]);

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      loadUnreadCount();
    }
    // Fetch products without requiring login
    fetchProducts(1);
    setLoading(false);
  }, [fetchProducts]);

  useEffect(() => {
    if (activeTab !== "create") {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchProducts(1);
    }
  }, [activeTab, fetchProducts]);

  const loadUnreadCount = async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      fetchProducts(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStartChat = async (listing) => {
    const currentUser = JSON.parse(sessionStorage.getItem("user"));
    if (!currentUser) {
      navigate("/signin");
      return;
    }

    try {
      // Get seller ID - could be populated object or just an ID string
      const sellerId = typeof listing.createdBy === 'object'
        ? listing.createdBy._id
        : listing.createdBy;

      const response = await fetch(
        `${API_URL}/chat/conversations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify({
            productId: listing._id,
            sellerId: sellerId,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.data) {
        navigate("/chat", { state: { conversationId: data.data._id } });
      } else {
        console.error("Failed to create conversation:", data.message);
        alert(data.message || "Failed to start chat. Please try again.");
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Failed to start chat. Please check your connection.");
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchProducts(1);
  };

  const handleToggleStatus = async (productId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    setToggling(productId);
    try {
      const response = await fetch(
        `${API_URL}/listings/${productId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p._id === productId ? { ...p, status: newStatus } : p
          )
        );
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    } finally {
      setToggling(null);
    }
  };

  const openDeleteModal = (product) => {
    setDeleteModal({ open: true, product });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, product: null });
  };

  const handleDeleteListing = async () => {
    const productId = deleteModal.product?._id;
    if (!productId) return;

    setDeleting(productId);
    closeDeleteModal();

    try {
      const response = await fetch(
        `${API_URL}/listings/${productId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        setProducts((prev) => prev.filter((p) => p._id !== productId));
      } else {
        alert(data.message || "Failed to delete listing");
      }
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Failed to delete listing");
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signin");
  };

  if (loading) {
    return <Loader fullScreen size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {user ? (
        <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      ) : (
        <GuestNavbar />
      )}
      <div className="container mx-auto px-4 py-4 sm:py-6 pt-20 sm:pt-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t("marketplace.title")}
            </h1>
          </div>
          <Button
            onClick={() => {
              if (!user) {
                navigate("/signin");
                return;
              }
              navigate("/listings/create");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 shadow-md hover:shadow-lg transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t("marketplace.addListing")}</span>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 font-medium transition-all duration-200 border-b-2 text-sm ${activeTab === "all"
              ? "border-primary-600 text-primary-600 dark:text-primary-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-primary-600"
              }`}
          >
            {t("marketplace.allListings")}
          </button>
          {user && (
            <button
              onClick={() => setActiveTab("my-listings")}
              className={`px-4 py-2 font-medium transition-all duration-200 border-b-2 text-sm ${activeTab === "my-listings"
                ? "border-primary-600 text-primary-600 dark:text-primary-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-primary-600"
                }`}
            >
              {t("marketplace.myListings")}
            </button>
          )}
        </div>

        {/* Create Product Form */}
        {activeTab === "create" && (
          <Card className="mb-6">
            <div className="text-center py-6 sm:py-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Add New Listing
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm sm:text-base">
                This will redirect you to the listing creation page.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button onClick={() => navigate("/listings/create")}>
                  Go to Add Listing
                </Button>
                <Button
                  onClick={() => setActiveTab("all")}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Filters - Compact inline bar */}
        {activeTab !== "create" && (
          <>
            {/* Compact Filter Bar - Always visible */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  name="search"
                  value={filter.search}
                  onChange={(e) => {
                    handleFilterChange(e);
                    // Auto-search on type with debounce
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  placeholder="Search listings..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                />
              </div>

              {/* Category Dropdown */}
              <select
                name="category"
                value={filter.category}
                onChange={(e) => {
                  handleFilterChange(e);
                  setTimeout(() => {
                    setPagination(prev => ({ ...prev, page: 1 }));
                    fetchProducts(1);
                  }, 0);
                }}
                className="min-w-[160px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer shadow-sm appearance-none bg-no-repeat bg-right pr-8"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem', backgroundPosition: 'right 0.5rem center' }}
              >
                <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">All Categories</option>
                <option value="crops" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">🌾 Crops</option>
                <option value="livestock" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">🐄 Livestock</option>
                <option value="equipment" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">🚜 Equipment</option>
                <option value="fertilizers" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">🧪 Fertilizers</option>
                <option value="seeds" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">🌱 Seeds</option>
                <option value="other" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">📦 Other</option>
              </select>

              {/* More Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm ${showFilters
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Price Filter</span>
              </button>

              {/* Search Button */}
              <Button
                onClick={applyFilters}
                className="px-4 py-2 rounded-lg text-sm"
              >
                Search
              </Button>
            </div>

            {/* Expanded Price Filters */}
            {showFilters && (
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl flex flex-wrap items-center gap-3 border border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-400 font-medium">Price Range:</span>
                <input
                  type="number"
                  name="minPrice"
                  value={filter.minPrice}
                  onChange={handleFilterChange}
                  placeholder="Min (Rs.)"
                  className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                />
                <span className="text-gray-500 dark:text-gray-400">—</span>
                <input
                  type="number"
                  name="maxPrice"
                  value={filter.maxPrice}
                  onChange={handleFilterChange}
                  placeholder="Max (Rs.)"
                  className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                />
                <button
                  onClick={() => {
                    setFilter({ category: "", search: "", minPrice: "", maxPrice: "" });
                    setPagination(prev => ({ ...prev, page: 1 }));
                    setTimeout(() => fetchProducts(1), 0);
                  }}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </>
        )}

        {/* Products Grid */}
        {activeTab !== "create" && (
          <>
            {products.length === 0 ? (
              <div className="text-center py-16 sm:py-24">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                  <Package className="w-12 h-12 text-primary-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {activeTab === "my-listings"
                    ? "No listings yet"
                    : "No listings found"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {activeTab === "my-listings"
                    ? "Start selling by creating your first listing. It only takes a minute!"
                    : "Try adjusting your filters or search terms to find what you're looking for."}
                </p>
                {activeTab === "my-listings" && (
                  <Button
                    onClick={() => navigate("/listings/create")}
                    className="px-8 py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25"
                  >
                    <Plus className="w-5 h-5 mr-2 inline" />
                    Create Your First Listing
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {products.map((product) => (
                    <div
                      key={product._id}
                      onClick={() => navigate(`/listings/${product._id}`)}
                      className="group bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800 transform hover:-translate-y-1 cursor-pointer"
                    >
                      {/* Image Container */}
                      <div className="relative overflow-hidden">
                        <ImageCarousel
                          images={product.images}
                          alt={product.title}
                          aspectRatio="h-44 sm:h-52"
                          showDots={true}
                          showArrows={true}
                        />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        {/* Category Badge */}
                        <span className="absolute top-3 left-3 px-3 py-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm text-xs font-semibold text-primary-700 dark:text-primary-400 rounded-full shadow-sm capitalize z-20">
                          {product.category}
                        </span>

                        {/* Status Badge */}
                        {product.status && product.status !== "active" && (
                          <span className={`absolute top-3 right-12 px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm backdrop-blur-sm z-20 ${product.status === "sold"
                            ? "bg-red-500/90 text-white"
                            : "bg-yellow-500/90 text-white"
                            }`}>
                            {product.status === "sold" ? "Sold" : "Inactive"}
                          </span>
                        )}

                        {/* Quick View on Hover */}
                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/listings/${product._id}`);
                            }}
                            className="p-2.5 bg-white/95 dark:bg-gray-900/95 rounded-full shadow-lg hover:bg-primary-50 dark:hover:bg-primary-900/50 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col">
                        {/* Title */}
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {product.title}
                        </h3>

                        {/* Description */}
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2 flex-1 leading-relaxed">
                          {product.description}
                        </p>

                        {/* Price Section */}
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            Rs. {product.price.toLocaleString()}
                          </span>
                          {product.unit && (
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                              / {product.unit}
                            </span>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-primary-500" />
                            <span className="truncate max-w-[100px]">{product.location}</span>
                          </div>
                          {product.quantity && (
                            <div className="flex items-center gap-1.5">
                              <Package className="w-4 h-4 text-primary-500" />
                              <span>{product.quantity} {product.unit || 'units'}</span>
                            </div>
                          )}
                        </div>

                        {/* Seller Info */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {product.createdBy?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                {product.createdBy?.name || 'Unknown'}
                              </span>
                              {product.createdBy?.isEmailVerified && (
                                <ShieldCheck className="w-4 h-4 text-primary-500 flex-shrink-0" title="Verified User" />
                              )}
                            </div>
                            {product.createdBy?.rating && product.createdBy.rating.count > 0 ? (
                              <UserRating
                                rating={product.createdBy.rating}
                                size="sm"
                                showCount={true}
                                clickable={true}
                                onClick={() => setReviewsModal({
                                  isOpen: true,
                                  userId: product.createdBy._id,
                                  userName: product.createdBy.name
                                })}
                              />
                            ) : (
                              <span className="text-xs text-gray-400">New Seller</span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {activeTab === "my-listings" ? (
                          <div className="space-y-2 mt-auto">
                            <div className="flex gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/listings/edit/${product._id}`);
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm py-2.5 flex items-center justify-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(product._id, product.status);
                                }}
                                disabled={toggling === product._id || product.status === "sold"}
                                className={`flex-1 text-sm py-2.5 flex items-center justify-center gap-2 ${product.status === "active"
                                  ? "bg-amber-500 hover:bg-amber-600"
                                  : "bg-emerald-500 hover:bg-emerald-600"
                                  }`}
                              >
                                {product.status === "active" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {toggling === product._id
                                  ? "..."
                                  : product.status === "active"
                                    ? "Hide"
                                    : "Show"}
                              </Button>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(product);
                              }}
                              disabled={deleting === product._id}
                              className="w-full bg-red-500 hover:bg-red-600 text-sm py-2.5 flex items-center justify-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              {deleting === product._id ? "Deleting..." : "Delete Listing"}
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-auto">
                            {/* Show contact button if not the seller */}
                            {(!user || (user?._id || user?.id) !== product?.createdBy?._id) && (
                              <div className="flex flex-col gap-2">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/buy/${product._id}`, { state: { listing: product } });
                                  }}
                                  className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300"
                                >
                                  <ShoppingCart className="w-4 h-4" />
                                  {t("marketplace.listing.buyNow")}
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartChat(product);
                                  }}
                                  variant="outline"
                                  className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl border-2 border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all duration-300"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  {t("marketplace.listing.contactSeller")}
                                </Button>
                              </div>
                            )}

                            {user && ((user?._id || user?.id) === product?.createdBy?._id) && (
                              <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 py-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
                                <CheckCircle className="w-4 h-4" />
                                {t("marketplace.listing.yourListing")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} listings
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {/* First page */}
                        {pagination.page > 2 && (
                          <>
                            <button
                              onClick={() => handlePageChange(1)}
                              className="px-3.5 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              1
                            </button>
                            {pagination.page > 3 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                          </>
                        )}

                        {/* Previous page */}
                        {pagination.page > 1 && (
                          <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            className="px-3.5 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            {pagination.page - 1}
                          </button>
                        )}

                        {/* Current page */}
                        <button
                          className="px-3.5 py-2 rounded-xl text-sm font-medium bg-primary-500 text-white shadow-md"
                        >
                          {pagination.page}
                        </button>

                        {/* Next page */}
                        {pagination.page < pagination.pages && (
                          <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            className="px-3.5 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            {pagination.page + 1}
                          </button>
                        )}

                        {/* Last page */}
                        {pagination.page < pagination.pages - 1 && (
                          <>
                            {pagination.page < pagination.pages - 2 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(pagination.pages)}
                              className="px-3.5 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              {pagination.pages}
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Reviews Modal */}
      <ReviewsModal
        isOpen={reviewsModal.isOpen}
        onClose={() => setReviewsModal({ isOpen: false, userId: null, userName: "" })}
        userId={reviewsModal.userId}
        userName={reviewsModal.userName}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteListing}
        title="Delete Listing"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              "{deleteModal.product?.title}"
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmText="Delete"
        variant="danger"
      />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Products;
