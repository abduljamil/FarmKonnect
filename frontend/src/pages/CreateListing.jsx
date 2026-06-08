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
import { useLanguage } from "../contexts/LanguageContext";

const CreateProduct = () => {
  const { t } = useLanguage();
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
    { value: "crops", label: t("marketplace.categories.crops") },
    { value: "livestock", label: t("marketplace.categories.livestock") },
    { value: "equipment", label: t("marketplace.categories.equipment") },
    { value: "fertilizers", label: t("marketplace.categories.fertilizers") },
    { value: "seeds", label: t("marketplace.categories.seeds") },
    { value: "other", label: t("marketplace.categories.other") },
  ];

  const units = [
    { value: "kg", label: t("createListing.units.kg") },
    { value: "ton", label: t("createListing.units.ton") },
    { value: "piece", label: t("createListing.units.piece") },
    { value: "dozen", label: t("createListing.units.dozen") },
    { value: "bag", label: t("createListing.units.bag") },
    { value: "liter", label: t("createListing.units.liter") },
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
    if (!formData.unit) {
      setError("Please select a unit");
      setLoading(false);
      return;
    }
    if (!formData.title || !formData.description || !formData.price || !formData.location) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      setError("Price must be greater than 0");
      setLoading(false);
      return;
    }

    if (formData.quantity && parseFloat(formData.quantity) < 0) {
      setError("Quantity cannot be negative");
      setLoading(false);
      return;
    }

    if (imageFiles.every(f => f === null) && imagePreviews.length === 0) {
      setError("Please upload at least one image");
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
        } catch (error) {
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
          {t("createListing.title")}
        </h1>

        <Card className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm sm:text-base">
                {error}
              </div>
            )}

            <Input
              label={t("createListing.form.title")}
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={t("createListing.form.titlePlaceholder")}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                {t("createListing.form.description")}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t("createListing.form.descriptionPlaceholder")}
                rows={4}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-900 dark:text-white dark:border-gray-600 dark:placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label={t("createListing.form.price")}
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                placeholder={t("createListing.form.pricePlaceholder")}
                required
                min="0"
                step="0.01"
              />

              <Select
                label={t("createListing.form.category")}
                name="category"
                value={formData.category}
                onChange={handleChange}
                options={categories}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label={t("createListing.form.quantity")}
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                placeholder={t("createListing.form.quantityPlaceholder")}
                required
                min="0"
              />

              <Select
                label={t("createListing.form.unit")}
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                options={units}
                required
              />
            </div>

            <Input
              label={t("createListing.form.location")}
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={t("createListing.form.locationPlaceholder")}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">
                {t("createListing.form.images")}
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
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (imageFiles.length > 0 ? t("common2.uploading") : t("createListing.creating")) : t("createListing.submit")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateProduct;
