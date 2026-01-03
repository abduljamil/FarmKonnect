import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Navbar from "../components/Navbar";
import Loader from "../components/Loader";
import chatAPI from "../utils/chatApi";

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState("all"); // all, my-products, create
  const [filter, setFilter] = useState({
    category: "",
    search: "",
    minPrice: "",
    maxPrice: "",
  });

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

      let endpoint = "http://localhost:3000/api/products";
      if (activeTab === "my-products") {
        endpoint = "http://localhost:3000/api/products/my/products";
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Marketplace
          </h1>
          {(user?.role === "seller" || user?.role === "admin") && (
            <Button
              onClick={() => setActiveTab("create")}
              className="flex items-center gap-2"
            >
              <span>➕</span> Add Listing
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
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
              className={`px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
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
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Add New Listing
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will redirect you to the listing creation page.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate("/products/create")}>
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

        {/* Filters - Only show when not creating */}
        {activeTab !== "create" && (
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                name="search"
                value={filter.search}
                onChange={handleFilterChange}
                placeholder="Search listings..."
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <select
                name="category"
                value={filter.category}
                onChange={handleFilterChange}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="number"
                name="maxPrice"
                value={filter.maxPrice}
                onChange={handleFilterChange}
                placeholder="Max Price"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="mt-4">
              <Button onClick={applyFilters}>Apply Filters</Button>
            </div>
          </Card>
        )}

        {/* Products Grid */}
        {activeTab !== "create" && (
          <>
            {products.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {activeTab === "my-products"
                  ? "You haven't created any listings yet"
                  : "No listings found"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card
                key={product._id}
                className="hover:shadow-lg transition-shadow"
              >
                {product.images?.[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {product.title}
                    </h3>
                    <span className="text-sm px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded font-medium">
                      {product.category}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      ${product.price.toLocaleString()}
                    </span>
                    {product.unit && (
                      <span className="text-sm text-gray-500">
                        per {product.unit}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    <div>📍 {product.location}</div>
                    <div>👤 {product.seller.name}</div>
                    {product.quantity && (
                      <div>📦 Quantity: {product.quantity}</div>
                    )}
                  </div>

                  {activeTab === "my-products" ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate(`/products/edit/${product._id}`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => {
                          if (window.confirm('Delete this listing?')) {
                            // Add delete logic here
                          }
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <>
                      {user && (user._id || user.id) !== product.seller._id && (
                        <Button
                          onClick={() => handleStartChat(product)}
                          className="w-full"
                        >
                          Contact Seller
                        </Button>
                      )}

                      {user && ((user._id || user.id) === product.seller._id) && (
                        <div className="text-sm font-medium text-primary-600 dark:text-primary-400 text-center py-2 bg-primary-50 dark:bg-primary-900/20 rounded">
                          Your Listing
                        </div>
                      )}
                    </>
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
