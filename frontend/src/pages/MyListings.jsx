import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config";
import { Plus, MapPin, Package, Calendar } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Navbar from "../components/Navbar";
import ConfirmModal from "../components/ConfirmModal";
import chatAPI from "../utils/chatApi";

const MyProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, product: null });

  useEffect(() => {
    const userData = sessionStorage.getItem("user");

    if (!userData) {
      navigate("/signin");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    loadUnreadCount();
    fetchMyProducts();
  }, [navigate]);

  const loadUnreadCount = async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const fetchMyProducts = async () => {
    try {
      const response = await fetch(
        `${API_URL}/listings/my/listings`,
        {
          credentials: 'include',
        }
      );
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (product) => {
    setDeleteModal({ open: true, product });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, product: null });
  };

  const handleDelete = async () => {
    const productId = deleteModal.product?._id;
    if (!productId) return;

    setDeleting(productId);
    closeDeleteModal();

    try {
      const response = await fetch(
        `${API_URL}/listings/${productId}`,
        {
          method: "DELETE",
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success) {
        // Remove listing from list
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
          credentials: 'include',
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Update listing status in list
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

  const handleEdit = (productId) => {
    navigate(`/listings/edit/${productId}`);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signin");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-600 dark:text-gray-400 flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mb-3"></div>
          Loading your products...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 sm:pt-20">
      {user && (
        <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      )}
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            My Products
          </h1>
          <Button onClick={() => navigate("/products/create")} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create New Product</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {products.length === 0 ? (
          <Card className="text-center py-8 sm:py-12">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You haven't posted any products yet
            </p>
            <Button onClick={() => navigate("/products/create")}>
              Create Your First Product
            </Button>
          </Card>
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
                    className="w-full h-36 sm:h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-36 sm:h-48 bg-gray-200 dark:bg-gray-800 rounded-t-lg flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white line-clamp-1">
                      {product.title}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                        product.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : product.status === "sold"
                          ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex justify-between items-center">
                    <span className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">
                      Rs. {product.price.toLocaleString()}
                    </span>
                    <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded">
                      {product.category}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{product.location}</span>
                    </div>
                    {product.quantity && (
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        <span>Qty: {product.quantity} {product.unit}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(product._id)}
                        className="flex-1 text-sm py-2"
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
                      onClick={() => openDeleteModal(product)}
                      disabled={deleting === product._id}
                      className="w-full bg-red-600 hover:bg-red-700 text-sm py-2"
                    >
                      {deleting === product._id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
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
    </div>
  );
};

export default MyProducts;
