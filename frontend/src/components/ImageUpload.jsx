import { useState, useRef } from "react";
import { uploadAPI } from "../utils/api";
import Loader from "./Loader";

const ImageUpload = ({
  images = [],
  onImagesChange,
  maxImages = 10,
  type = "product", // 'product' or 'avatar'
  className = "",
  deferUpload = false, // If true, store files locally instead of uploading immediately
  files = [], // File objects when deferUpload is true
  onFilesChange, // Callback for file changes when deferUpload is true
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const currentCount = deferUpload ? files.length : images.length;
    const remainingSlots = maxImages - currentCount;
    if (remainingSlots <= 0) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToProcess = Array.from(selectedFiles).slice(0, remainingSlots);

    // Validate file types
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const invalidFiles = filesToProcess.filter(
      (file) => !validTypes.includes(file.type)
    );

    if (invalidFiles.length > 0) {
      setError("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    // Validate file sizes
    const maxSize = type === "avatar" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    const oversizedFiles = filesToProcess.filter((file) => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      setError(
        `File size must be less than ${type === "avatar" ? "2MB" : "5MB"}`
      );
      return;
    }

    setError("");

    // If deferUpload, store files locally with preview URLs
    if (deferUpload) {
      const newFiles = [...files, ...filesToProcess];
      onFilesChange(newFiles);

      // Create preview URLs for display
      const newPreviews = filesToProcess.map(file => URL.createObjectURL(file));
      onImagesChange([...images, ...newPreviews]);
      return;
    }

    // Otherwise, upload immediately
    setUploading(true);

    try {
      if (type === "avatar") {
        const result = await uploadAPI.uploadAvatar(filesToProcess[0]);
        onImagesChange([result.data.avatar]);
      } else {
        const result = await uploadAPI.uploadListingImages(filesToProcess);
        onImagesChange([...images, ...result.data.images]);
      }
    } catch (err) {
      setError(err.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = ""; // Reset input
  };

  const removeImage = async (index) => {
    const imageToRemove = images[index];

    // If deferUpload, just remove from local state (revoke object URL)
    if (deferUpload) {
      if (imageToRemove && imageToRemove.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove);
      }
      const newFiles = files.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    } else if (imageToRemove) {
      // Try to delete from Cloudinary only if already uploaded
      try {
        await uploadAPI.deleteImage(imageToRemove);
      } catch (err) {
        console.error("Failed to delete image from storage:", err);
      }
    }

    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const moveImage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onImagesChange(newImages);

    // Also reorder files if in deferUpload mode
    if (deferUpload && files.length > 0) {
      const newFiles = [...files];
      const [movedFile] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, movedFile);
      onFilesChange(newFiles);
    }
  };

  if (type === "avatar") {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div
          className={`relative w-32 h-32 rounded-full overflow-hidden border-4 ${dragActive
            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
            : "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
            } transition-all duration-200 cursor-pointer group`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {images.length > 0 ? (
            <>
              <img
                src={images[0]}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium">Change</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <svg
                className="w-10 h-10 mb-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-xs">Upload</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Click or drag to upload (max 2MB)
        </p>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${dragActive
          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
          : "border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500"
          } ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        <div className="flex flex-col items-center">
          {uploading ? (
            <>
              <Loader size="sm" className="mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uploading...
              </p>
            </>
          ) : (
            <>
              <svg
                className="w-12 h-12 text-gray-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                JPG, PNG, WebP (max 5MB each, up to {maxImages} images)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {images.length} / {maxImages} images
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drag to reorder • First image is the cover
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((image, index) => (
              <div
                key={`${image || 'img'}-${index}`}
                className={`relative aspect-square rounded-lg overflow-hidden group ${index === 0
                  ? "ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-900"
                  : ""
                  }`}
              >
                <img
                  src={image}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Cover Badge */}
                {index === 0 && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary-500 text-white text-xs font-medium rounded">
                    Cover
                  </span>
                )}

                {/* Overlay Controls */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveImage(index, index - 1);
                      }}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                      title="Move left"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                    className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                    title="Remove"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                  {index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveImage(index, index + 1);
                      }}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                      title="Move right"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
