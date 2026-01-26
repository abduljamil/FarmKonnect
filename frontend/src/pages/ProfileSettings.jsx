import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronRight } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import ImageUpload from "../components/ImageUpload";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import UserRating from "../components/UserRating";
import ReviewsModal from "../components/ReviewsModal";
import { userAPI } from "../utils/api";
import { useLanguage } from "../contexts/LanguageContext";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    location: "",
    bio: "",
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Avatar state
  const [avatar, setAvatar] = useState([]);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getProfile();
      const userData = response.data;
      setUser(userData);
      setProfileForm({
        name: userData.name || "",
        phone: userData.phone || "",
        location: userData.location || "",
        bio: userData.bio || "",
      });
      if (userData.avatar) {
        setAvatar([userData.avatar]);
      }
    } catch (err) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const updateData = {
        ...profileForm,
        avatar: avatar.length > 0 ? avatar[0] : null,
      };
      const response = await userAPI.updateProfile(updateData);
      setUser(response.data);

      // Update session storage user data
      const storedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
      sessionStorage.setItem(
        "user",
        JSON.stringify({ ...storedUser, ...response.data })
      );

      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setSaving(true);

    try {
      await userAPI.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      setSuccess("Password changed successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    // For Google OAuth users, skip password check
    if (user.authProvider !== 'google' && !deletePassword) {
      setError("Please enter your password to confirm");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Delete account - backend will clear the cookie
      await userAPI.deleteAccount(deletePassword);

      // Clear all storage
      sessionStorage.clear();
      localStorage.clear();

      // Show success message using alert and redirect
      alert("Account deleted successfully!");

      // Force full page reload to clear all state and redirect
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Failed to delete account");
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 pt-20 sm:pt-24">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {t("common.back")}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("settings.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("settings.subtitle")}
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <ErrorMessage message={error} onClose={() => setError("")} />
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-green-700 dark:text-green-300">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <Card className="p-2">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === "profile"
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {t("settings.tabs.profile")}
                </button>
                {user?.authProvider !== 'google' && (
                  <button
                    onClick={() => setActiveTab("security")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === "security"
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    {t("settings.tabs.security")}
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("logout")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === "logout"
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  {t("settings.tabs.logout")}
                </button>
                <button
                  onClick={() => setActiveTab("danger")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === "danger"
                      ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  {t("settings.tabs.dangerZone")}
                </button>
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <Card>
                <form onSubmit={handleProfileSubmit}>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    {t("settings.profileInfo")}
                  </h2>

                  {/* User Rating Display */}
                  {user?.rating && user.rating.count > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewsModalOpen(true)}
                      className="w-full mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t("settings.yourRating")}
                          </h3>
                          <UserRating rating={user.rating} size="lg" showCount={true} />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {t("settings.basedOn")} {user.rating.count} {user.rating.count === 1 ? t("settings.review") : t("settings.reviews")}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                      </div>
                      <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
                        Click to view all reviews
                      </p>
                    </button>
                  )}

                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center mb-8">
                    {user?.authProvider === "google" ? (
                      <div className="flex flex-col items-center">
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                          {avatar.length > 0 || user?.avatar ? (
                            <img
                              src={avatar[0] || user?.avatar}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="w-full h-full items-center justify-center bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 font-bold text-4xl"
                            style={{ display: avatar.length > 0 || user?.avatar ? 'none' : 'flex' }}
                          >
                            {user?.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z" />
                          </svg>
                          Synced with Google
                        </p>
                      </div>
                    ) : (
                      <ImageUpload
                        images={avatar}
                        onImagesChange={setAvatar}
                        type="avatar"
                        maxImages={1}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label={t("settings.fullName")}
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                      required
                      placeholder={t("settings.fullName")}
                    />

                    <Input
                      label={t("settings.email")}
                      value={user?.email || ""}
                      disabled
                      className="bg-gray-100 dark:bg-gray-800"
                    />

                    <Input
                      label="Phone Number"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, phone: e.target.value })
                      }
                      placeholder="+92 300 1234567"
                    />

                    <Input
                      label="Location"
                      value={profileForm.location}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          location: e.target.value,
                        })
                      }
                      placeholder="City, Province"
                    />
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, bio: e.target.value })
                      }
                      rows={4}
                      maxLength={500}
                      placeholder="Tell us about yourself..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                      {profileForm.bio.length}/500
                    </p>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Security Tab - Only for non-OAuth users */}
            {activeTab === "security" && user?.authProvider !== 'google' && (
              <Card>
                <form onSubmit={handlePasswordSubmit}>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Change Password
                  </h2>

                  <div className="space-y-6">
                    <Input
                      label="Current Password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      required
                      placeholder="Enter current password"
                    />

                    <Input
                      label="New Password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      required
                      placeholder="Enter new password (min 6 characters)"
                    />

                    <Input
                      label="Confirm New Password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Changing..." : "Change Password"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Logout Tab */}
            {activeTab === "logout" && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t("settings.logoutTitle")}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t("settings.logoutDesc")}
                </p>

                <Button
                  variant="danger"
                  onClick={async () => {
                    try {
                      const { authAPI } = await import("../utils/api");
                      await authAPI.logout();
                      sessionStorage.removeItem("user");
                      navigate("/");
                    } catch (err) {
                      setError(err.message || "Failed to logout");
                    }
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("settings.tabs.logout")}
                </Button>
              </Card>
            )}

            {/* Danger Zone Tab */}
            {activeTab === "danger" && (
              <Card className="border-red-200 dark:border-red-800">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
                  {t("settings.dangerZoneTitle")}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t("settings.dangerZoneWarning")}
                </p>

                {!showDeleteConfirm ? (
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    {t("settings.deleteAccount")}
                  </Button>
                ) : (
                  <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <h3 className="font-semibold text-red-700 dark:text-red-300 mb-4">
                      {t("settings.deleteConfirmTitle")}
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                      {t("settings.deleteConfirmDesc")}
                    </p>

                    {user?.authProvider !== 'google' && (
                      <Input
                        label="Enter your password to confirm"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                      />
                    )}

                    {user?.authProvider === 'google' && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        You signed in with Google. Click confirm to delete your account.
                      </p>
                    )}

                    <div className="mt-4 flex gap-3">
                      <Button
                        variant="danger"
                        onClick={handleDeleteAccount}
                        disabled={saving}
                      >
                        {saving ? "Deleting..." : "Yes, Delete My Account"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeletePassword("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Modal */}
      <ReviewsModal
        isOpen={reviewsModalOpen}
        onClose={() => setReviewsModalOpen(false)}
        userId={user?._id}
        userName={user?.name}
      />
    </div>
  );
};

export default ProfileSettings;
