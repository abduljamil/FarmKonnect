import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_URL from "../config";
import { MapPin, Package, Calendar, User, MessageCircle, ShoppingCart, ArrowLeft, Eye, EyeOff, ShieldCheck, Trash2, Edit2 } from "lucide-react";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import ImageCarousel from "../components/ImageCarousel";
import UserRating from "../components/UserRating";
import ReviewsModal from "../components/ReviewsModal";
import ConfirmModal from "../components/ConfirmModal";
import Button from "../components/Button";
import chatAPI from "../utils/chatApi";
import useUserSync from "../hooks/useUserSync";

const ListingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reviewsModal, setReviewsModal] = useState({ isOpen: false, userId: null, userName: "" });
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useUserSync(user, setUser, navigate);

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      loadUnreadCount();
    }
    fetchListing();
  }, [id, fetchListing]);

  const loadUnreadCount = async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const fetchListing = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/listings/${id}`);
      const data = await response.json();

      if (data.success) {
        setListing(data.data);
      } else {
        setError(data.message || "Listing not found");
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
      setError("Failed to load listing");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleContactSeller = async () => {
    if (!user) {
      navigate("/signin");
      return;
    }

    if (listing?.createdBy?._id === user?._id) {
      alert("You cannot message yourself");
      return;
    }

    try {
      await chatAPI.getOrCreateConversation(listing._id, listing.createdBy._id);
      navigate("/chat");
    } catch (error) {
      console.error("Error creating conversation:", error);
      alert("Failed to start conversation");
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      navigate("/signin");
      return;
    }

    if (listing?.createdBy?._id === user?._id) {
      alert("You cannot buy your own listing");
      return;
    }

    navigate(`/buy/${listing._id}`);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signin");
  };

  const handleToggleStatus = async () => {
    const newStatus = listing.status === "active" ? "inactive" : "active";
    try {
      const response = await fetch(
        `${API_URL}/listings/${id}/status`,
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
        setListing(prev => ({ ...prev, status: newStatus }));
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const handleDeleteListing = async () => {
    setDeleting(true);
    setDeleteModal(false);

    try {
      const response = await fetch(
        `${API_URL}/listings/${id}`,
        {
          method: "DELETE",
          credentials: 'include',
        }
      );

      const data = await response.json();
      if (data.success) {
        navigate("/listings");
      } else {
        alert(data.message || "Failed to delete listing");
      }
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Failed to delete listing");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loader fullScreen size="lg" />;
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 sm:pt-20">
        {user ? (
          <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
        ) : (
          <GuestNavbar />
        )}
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || "Listing not found"}
          </h1>
          <Button onClick={() => navigate("/listings")}>
            Back to Marketplace
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const userId = user?._id || user?.id;
  const ownerId = listing?.createdBy?._id || listing?.createdBy;
  const isOwnListing = userId && ownerId && userId.toString() === ownerId.toString();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 sm:pt-20">
      {user ? (
        <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
      ) : (
        <GuestNavbar />
      )}

      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-4">
            <ImageCarousel
              images={listing.images || []}
              alt={listing.title}
              className="rounded-xl"
              aspectRatio="aspect-[4/3]"
              showDots={true}
              showArrows={true}
            />

            {/* Status Badge */}
            {listing.status && listing.status !== "active" && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  {listing.status === "sold" ? "🔴 This item has been sold" : "⚠️ This listing is currently inactive"}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Category Badge */}
            <span className="inline-block px-4 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
              {listing.category}
            </span>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {listing.title}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                Rs. {listing.price.toLocaleString()}
              </span>
              {listing.unit && (
                <span className="text-lg text-gray-500 dark:text-gray-400">
                  / {listing.unit}
                </span>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-500" />
                <span>{listing.location}</span>
              </div>
              {listing.quantity && (
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-500" />
                  <span>{listing.quantity} {listing.unit || 'units'} available</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-500" />
                <span>Posted {new Date(listing.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Seller Info */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                Seller Information
              </h3>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                  {listing.createdBy?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                      {listing.createdBy?.name || 'Unknown Seller'}
                    </h4>
                    {listing.createdBy?.isEmailVerified && (
                      <ShieldCheck className="w-5 h-5 text-primary-500" title="Verified User" />
                    )}
                  </div>
                  {listing.createdBy?.rating && listing.createdBy.rating.count > 0 ? (
                    <UserRating
                      rating={listing.createdBy.rating}
                      size="md"
                      showCount={true}
                      clickable={true}
                      onClick={() => setReviewsModal({
                        isOpen: true,
                        userId: listing.createdBy._id,
                        userName: listing.createdBy.name
                      })}
                    />
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No reviews yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!isOwnListing && listing.status === "active" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleBuyNow}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Buy Now
                </Button>
                <Button
                  onClick={handleContactSeller}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contact Seller
                </Button>
              </div>
            )}

            {isOwnListing && (
              <div className="flex flex-col gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-blue-800 dark:text-blue-200 font-medium flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    This is your listing
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => navigate(`/listings/edit/${listing._id}`)}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>

                  <Button
                    onClick={handleToggleStatus}
                    className={`flex items-center justify-center gap-2 ${listing.status === "active"
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-emerald-500 hover:bg-emerald-600"
                      }`}
                  >
                    {listing.status === "active" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {listing.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </div>

                <Button
                  onClick={() => setDeleteModal(true)}
                  disabled={deleting}
                  className="w-full bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? "Deleting..." : "Delete Listing"}
                </Button>
              </div>
            )}

            {/* Description */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Description
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Reviews Modal */}
      {reviewsModal.isOpen && (
        <ReviewsModal
          isOpen={reviewsModal.isOpen}
          onClose={() => setReviewsModal({ isOpen: false, userId: null, userName: "" })}
          userId={reviewsModal.userId}
          userName={reviewsModal.userName}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDeleteListing}
        title="Delete Listing"
        message={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              "{listing?.title}"
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default ListingDetails;
