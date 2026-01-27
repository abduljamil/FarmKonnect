import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Navbar from "../components/Navbar";
import ImageUpload from "../components/ImageUpload";
import { uploadAPI } from "../utils/api";
import chatAPI from "../utils/chatApi";

const CreateProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
  });
  const [imagePreviews, setImagePreviews] = useState([]); // For displaying previews
  const [imageFiles, setImageFiles] = useState([]); // Actual File objects to upload

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

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  }, []);

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      loadUnreadCount();
    } else {
      // Redirect to signin if not logged in
      navigate("/signin");
    }
  }, [navigate, loadUnreadCount]);

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

    // Frontend validation
    if (!formData.category) {
      setError("Please select a category");
      setLoading(false);
      return;
    }
    if (!formData.title || !formData.description || !formData.price || !formData.location) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      // Upload images first (if any)
      let uploadedImageUrls = [];
      if (imageFiles.length > 0) {
        try {
          const uploadResult = await uploadAPI.uploadListingImages(imageFiles);
          uploadedImageUrls = uploadResult.data.images;
        } catch (error) { // eslint-disable-line no-unused-vars
          console.error("Upload error:", error);
          setError("Failed to upload images. Please try again.");
          setLoading(false);
          return;
        }
      }

      const productData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        location: formData.location,
        quantity: formData.quantity ? parseFloat(formData.quantity) : 1,
        unit: formData.unit || undefined,
        images: uploadedImageUrls,
      };

      const response = await fetch(`${API_URL}/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Uses cookies for auth
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (data.success) {
        // Clean up preview URLs
        imagePreviews.forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        navigate("/listings");
      } else {
        setError(data.message || "Failed to create listing");
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-4 sm:py-8 pt-20 sm:pt-24">
      {user && (
        <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      )}
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Create Product Listing
        </h1>

        <Card className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm sm:text-base">
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
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white dark:border-gray-600 dark:placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label="Price (Rs.)"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">
                Product Images
              </label>
              <ImageUpload
                images={imagePreviews}
                onImagesChange={setImagePreviews}
                maxImages={10}
                type="product"
                deferUpload={true}
                files={imageFiles}
                onFilesChange={setImageFiles}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/products")}
                disabled={loading}
                className="sm:flex-none"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (imageFiles.length > 0 ? "Uploading images..." : "Creating...") : "Create Product"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateProduct;
