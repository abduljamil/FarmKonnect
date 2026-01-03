import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Navbar from "../components/Navbar";
import chatAPI from "../utils/chatApi";

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    location: "",
    quantity: "",
    unit: "",
    images: "",
    status: "",
  });

  const categories = [
    { value: "crops", label: "Crops" },
    { value: "livestock", label: "Livestock" },
    { value: "equipment", label: "Equipment" },
    { value: "fertilizers", label: "Fertilizers" },
    { value: "seeds", label: "Seeds" },
    { value: "other", label: "Other" },
  ];

  const units = [
    { value: "kg", label: "Kilogram (kg)" },
    { value: "ton", label: "Ton" },
    { value: "piece", label: "Piece" },
    { value: "dozen", label: "Dozen" },
    { value: "bag", label: "Bag" },
    { value: "liter", label: "Liter" },
  ];

  const statuses = [
    { value: "active", label: "Active" },
    { value: "sold", label: "Sold" },
    { value: "inactive", label: "Inactive" },
  ];

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    const token = sessionStorage.getItem("token");

    if (!userData || !token) {
      navigate("/signin");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== "seller" && parsedUser.role !== "admin") {
      navigate("/");
      return;
    }

    loadUnreadCount();
    fetchProduct();
  }, [id, navigate]);

  const loadUnreadCount = async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const fetchProduct = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/listings/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const product = data.data;

        // Check if user is the seller
        const userData = JSON.parse(sessionStorage.getItem("user"));
        if (product.seller._id !== userData.id) {
          setError("You are not authorized to edit this product");
          setTimeout(() => navigate("/my-products"), 2000);
          return;
        }

        setFormData({
          title: product.title,
          description: product.description,
          price: product.price.toString(),
          category: product.category,
          location: product.location,
          quantity: product.quantity?.toString() || "",
          unit: product.unit || "",
          images: product.images?.join("\n") || "",
          status: product.status || "active",
        });
      } else {
        setError(data.message || "Failed to load product");
      }
    } catch (err) {
      setError("An error occurred while loading the product");
      console.error(err);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        navigate("/signin");
        return;
      }

      // Process images (split by comma or newline)
      const imageUrls = formData.images
        .split(/[,\n]/)
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      const productData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        location: formData.location,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        images: imageUrls,
        status: formData.status,
      };

      const response = await fetch(`http://localhost:3000/api/listings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (data.success) {
        navigate("/my-listings");
      } else {
        setError(data.message || "Failed to update listing");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signin");
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-600 dark:text-gray-400">
          Loading product...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      {user && (
        <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      )}
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Edit Product
        </h1>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <Input
              label="Product Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Fresh Organic Wheat"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your product..."
                rows={4}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white dark:border-gray-600 dark:placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                required
                min="0"
                step="0.01"
              />

              <Select
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                options={categories}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
                required
                min="0"
              />

              <Select
                label="Unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                options={units}
                required
              />
            </div>

            <Input
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Lahore, Pakistan"
              required
            />

            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={statuses}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                Image URLs (one per line or comma separated)
              </label>
              <textarea
                name="images"
                value={formData.images}
                onChange={handleChange}
                placeholder="https://example.com/image1.jpg"
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white dark:border-gray-600 dark:placeholder-gray-500"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Optional: Add image URLs to showcase your product
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Updating..." : "Update Product"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/my-products")}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EditProduct;
