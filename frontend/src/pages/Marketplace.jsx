import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Plus, MapPin, User, Package, X } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import chatAPI from "../utils/chatApi";
import useUserSync from "../hooks/useUserSync";

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toggling, setToggling] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // all, my-products, create
  const [showFilters, setShowFilters] = useState(false); // Mobile filter toggle
  const [filter, setFilter] = useState({
    category: "",
    search: "",
    minPrice: "",
    maxPrice: "",
  });

  // Auto-sync user data (role updates)
  useUserSync(user, setUser, navigate);

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      loadUnreadCount();
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab !== "create") {
      fetchProducts();
    }
  }, [activeTab]);

  const loadUnreadCount = async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filter.category) queryParams.append("category", filter.category);
      if (filter.search) queryParams.append("search", filter.search);
      if (filter.minPrice) queryParams.append("minPrice", filter.minPrice);
      if (filter.maxPrice) queryParams.append("maxPrice", filter.maxPrice);

      let endpoint = "http://localhost:3000/api/listings";
      if (activeTab === "my-products") {
        endpoint = "http://localhost:3000/api/listings/my/listings";
      }

      const token = sessionStorage.getItem("token");
      const headers = activeTab === "my-products" && token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const response = await fetch(
        `${endpoint}?${queryParams.toString()}`,
        { headers }
      );
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (product) => {
    const currentUser = JSON.parse(sessionStorage.getItem("user"));
    if (!currentUser) {
      navigate("/signin");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(
        "http://localhost:3000/api/chat/conversations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: product._id,
            sellerId: product.seller._id,
          }),
        }
      );

      const data = await response.json();
      console.log("Chat API response:", data);

      if (data.success && data.data) {
        console.log("Navigating to chat with conversation:", data.data._id);
        navigate("/chat", { state: { conversationId: data.data._id } });
      } else {
        console.error("Failed to create conversation:", data);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchProducts();
  };

  const handleToggleStatus = async (productId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    
    setToggling(productId);
    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/listings/${productId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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

  const handleDeleteListing = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) {
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/listings/${productId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      {user && (
        <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      )}
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Marketplace
          </h1>
          <div className="flex gap-2">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            {(user?.role === "seller" || user?.role === "admin") && (
              <Button
                onClick={() => navigate("/listings/create")}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Listing</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 sm:px-6 py-2 sm:py-3 font-medium transition-all duration-200 border-b-2 whitespace-nowrap text-sm sm:text-base ${
              activeTab === "all"
                ? "border-primary-600 text-primary-600 dark:text-primary-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
            }`}
          >
            All Listings
          </button>
          {(user?.role === "seller" || user?.role === "admin") && (
            <button
              onClick={() => setActiveTab("my-products")}
              className={`px-4 sm:px-6 py-2 sm:py-3 font-medium transition-all duration-200 border-b-2 whitespace-nowrap text-sm sm:text-base ${
                activeTab === "my-products"
                  ? "border-primary-600 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              }`}
            >
              My Listings
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

        {/* Filters - Collapsible on mobile */}
        {activeTab !== "create" && (
          <Card className={`mb-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
            {/* Mobile Filter Header */}
            <div className="flex justify-between items-center mb-4 md:hidden">
              <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="search"
                  value={filter.search}
                  onChange={handleFilterChange}
                  placeholder="Search listings..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
              <select
                name="category"
                value={filter.category}
                onChange={handleFilterChange}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value="">All Categories</option>
                <option value="crops">Crops</option>
                <option value="livestock">Livestock</option>
                <option value="equipment">Equipment</option>
                <option value="fertilizers">Fertilizers</option>
                <option value="seeds">Seeds</option>
                <option value="other">Other</option>
              </select>
              <input
                type="number"
                name="minPrice"
                value={filter.minPrice}
                onChange={handleFilterChange}
                placeholder="Min Price"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              <input
                type="number"
                name="maxPrice"
                value={filter.maxPrice}
                onChange={handleFilterChange}
                placeholder="Max Price"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => { applyFilters(); setShowFilters(false); }} className="flex-1 sm:flex-none">
                Apply Filters
              </Button>
              <Button
                onClick={() => {
                  setFilter({ category: "", search: "", minPrice: "", maxPrice: "" });
                  setTimeout(fetchProducts, 0);
                }}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Clear
              </Button>
            </div>
          </Card>
        )}

        {/* Products Grid */}
        {activeTab !== "create" && (
          <>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-gray-500 dark:text-gray-400">
                  {activeTab === "my-products"
                    ? "You haven't created any listings yet"
                    : "No listings found"}
                </p>
                {activeTab === "my-products" && (
                  <Button onClick={() => navigate("/listings/create")} className="mt-4">
                    Create Your First Listing
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <Card
                key={product._id}
                className="hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-40 sm:h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-40 sm:h-48 bg-gray-200 dark:bg-gray-800 rounded-t-lg flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="p-3 sm:p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white line-clamp-1">
                      {product.title}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded font-medium whitespace-nowrap">
                      {product.category}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2 flex-1">
                    {product.description}
                  </p>

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">
                      Rs. {product.price.toLocaleString()}
                    </span>
                    {product.unit && (
                      <span className="text-xs sm:text-sm text-gray-500">
                        per {product.unit}
                      </span>
                    )}
                  </div>

                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{product.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate">{product.seller.name}</span>
                    </div>
                    {product.quantity && (
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        <span>Qty: {product.quantity}</span>
                      </div>
                    )}
                  </div>

                  {activeTab === "my-products" ? (
                    <div className="space-y-2 mt-auto">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigate(`/listings/edit/${product._id}`)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm py-2"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleToggleStatus(product._id, product.status)}
                          disabled={toggling === product._id || product.status === "sold"}
                          className={`flex-1 text-sm py-2 ${
                            product.status === "active"
                              ? "bg-yellow-600 hover:bg-yellow-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {toggling === product._id
                            ? "..."
                            : product.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleDeleteListing(product._id)}
                        className="w-full bg-red-600 hover:bg-red-700 text-sm py-2"
                      >
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-auto">
                      {user && (user._id || user.id) !== product.seller._id && (
                        <Button
                          onClick={() => handleStartChat(product)}
                          className="w-full text-sm py-2.5"
                        >
                          Contact Seller
                        </Button>
                      )}

                      {user && ((user._id || user.id) === product.seller._id) && (
                        <div className="text-sm font-medium text-primary-600 dark:text-primary-400 text-center py-2 bg-primary-50 dark:bg-primary-900/20 rounded">
                          Your Listing
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Products;
