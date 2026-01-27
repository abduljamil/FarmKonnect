import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_URL from "../config";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Navbar from "../components/Navbar";
import ImageUpload from "../components/ImageUpload";
import { uploadAPI } from "../utils/api";
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
    status: "",
  });
  const [imagePreviews, setImagePreviews] = useState([]); // URLs for display
  const [imageFiles, setImageFiles] = useState([]); // File objects (null for existing images)
  const [originalImages, setOriginalImages] = useState([]); // Track original images to detect deletions

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

    if (!userData) {
      navigate("/signin");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    loadUnreadCount();
    fetchProduct();
  }, [id, navigate, loadUnreadCount, fetchProduct]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  }, []);

  const fetchProduct = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/listings/${id}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        const product = data.data;

        // Check if user is the owner
        const userData = JSON.parse(sessionStorage.getItem("user"));
        const ownerId = (product.createdBy?._id || product.createdBy || product.seller?._id || product.seller)?.toString();
        const userId = (userData._id || userData.id)?.toString();

        if (ownerId && userId && ownerId !== userId) {
          setError("You are not authorized to edit this product");
          setTimeout(() => navigate("/my-listings"), 2000);
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
          status: product.status || "active",
        });

        // Initialize images - existing URLs with null placeholders in files array
        const existingImages = product.images || [];
        setImagePreviews(existingImages);
        setImageFiles(existingImages.map(() => null)); // null for each existing image
        setOriginalImages(existingImages); // Track original images for deletion detection
      } else {
        setError(data.message || "Failed to load product");
      }
    } catch (err) {
      setError("An error occurred while loading the product");
      console.error(err);
    } finally {
      setFetchLoading(false);
    }
  }, [id, navigate]);

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
      // Separate existing URLs from new files
      const existingUrls = [];
      const newFiles = [];

      imagePreviews.forEach((preview, index) => {
        if (preview.startsWith('blob:')) {
          // This is a new file - get corresponding File object
          const file = imageFiles[index];
          if (file) newFiles.push(file);
        } else {
          // This is an existing URL
          existingUrls.push(preview);
        }
      });

      // Upload new images if any
      let uploadedUrls = [];
      if (newFiles.length > 0) {
        try {
          const uploadResult = await uploadAPI.uploadListingImages(newFiles);
          uploadedUrls = uploadResult.data.images;
        } catch (uploadErr) {
          setError("Failed to upload images. Please try again.");
          setLoading(false);
          return;
        }
      }

      // Combine existing URLs with newly uploaded URLs
      const allImageUrls = [...existingUrls, ...uploadedUrls];

      const productData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        location: formData.location,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        images: allImageUrls,
        status: formData.status,
      };

      const response = await fetch(`${API_URL}/listings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (data.success) {
        // Clean up blob URLs
        imagePreviews.forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });

        // Delete removed images from Cloudinary
        const removedImages = originalImages.filter(url => !existingUrls.includes(url));
        for (const imageUrl of removedImages) {
          try {
            await uploadAPI.deleteImage(imageUrl);
          } catch (err) {
            console.error("Failed to delete image from Cloudinary:", err);
          }
        }

        navigate("/listings");
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 pt-20 sm:pt-24">
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

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (imageFiles.some(f => f !== null) ? "Uploading images..." : "Updating...") : "Update Product"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/my-listings")}
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
