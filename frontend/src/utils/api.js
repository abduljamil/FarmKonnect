import API_URL from "../config";
const API_BASE = API_URL;

// Custom error class for API errors
export class APIError extends Error {
  constructor(message, status, errorCode = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.errorCode = errorCode;
    this.isNetworkError = status === 0;
    this.isServerError = status >= 500;
    this.isServiceUnavailable = status === 503;
  }
}

// API helper function with enhanced error handling
const apiCall = async (endpoint, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies in requests
    });

    // Handle non-JSON responses
    let data;
    try {
      data = await response.json();
    } catch {
      data = { message: 'Invalid response from server' };
    }

    if (!response.ok) {
      throw new APIError(
        data.message || getDefaultErrorMessage(response.status),
        response.status,
        data.error || null
      );
    }

    return data;
  } catch (error) {
    // Handle network errors (server unreachable)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError(
        'Unable to connect to server. Please check your internet connection.',
        0,
        'NETWORK_ERROR'
      );
    }
    // Re-throw APIErrors as-is
    if (error instanceof APIError) {
      throw error;
    }
    // Handle other errors
    throw new APIError(error.message || 'An unexpected error occurred', 0);
  }
};

// File upload helper with enhanced error handling
const uploadFile = async (endpoint, formData) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      body: formData,
      credentials: 'include', // Include cookies in requests
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = { message: 'Invalid response from server' };
    }

    if (!response.ok) {
      throw new APIError(
        data.message || "Upload failed",
        response.status,
        data.error || null
      );
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError(
        'Unable to connect to server. Please check your internet connection.',
        0,
        'NETWORK_ERROR'
      );
    }
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(error.message || 'Upload failed', 0);
  }
};

// Helper function to get default error messages
const getDefaultErrorMessage = (status) => {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Please sign in to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
};

// Health check API
export const healthAPI = {
  check: async () => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        credentials: 'include',
      });
      return await response.json();
    } catch {
      return {
        success: false,
        status: 'unreachable',
        database: 'unknown',
        timestamp: new Date().toISOString(),
      };
    }
  },
};

// User API
export const userAPI = {
  // Get current user profile
  getProfile: async () => {
    return apiCall("/user/profile");
  },

  // Update user profile
  updateProfile: async (profileData) => {
    return apiCall("/user/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  // Update avatar
  updateAvatar: async (avatarUrl) => {
    return apiCall("/user/avatar", {
      method: "PATCH",
      body: JSON.stringify({ avatar: avatarUrl }),
    });
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    return apiCall("/user/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Delete account
  deleteAccount: async (password) => {
    return apiCall("/user/account", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
  },
};

// Upload API
export const uploadAPI = {
  // Upload listing images
  uploadListingImages: async (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });
    return uploadFile("/upload/listings", formData);
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return uploadFile("/upload/avatar", formData);
  },

  // Delete image
  deleteImage: async (imageUrl) => {
    return apiCall("/upload", {
      method: "DELETE",
      body: JSON.stringify({ imageUrl }),
    });
  },
};

// Auth API
export const authAPI = {
  // Login
  login: async (credentials) => {
    return apiCall("/auth/signin", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  // Signup
  signup: async (userData) => {
    return apiCall("/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  // Logout user
  logout: async () => {
    return apiCall("/auth/logout", {
      method: "POST",
    });
  },

  // Get current user
  getMe: async () => {
    return apiCall("/auth/me");
  },

  // Verify email
  verifyEmail: async (token) => {
    return apiCall(`/auth/verify-email/${token}`);
  },

  // Resend verification email
  resendVerification: async (email) => {
    return apiCall("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Request password reset
  forgotPassword: async (email) => {
    return apiCall("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Reset password with token
  resetPassword: async (token, password) => {
    return apiCall(`/auth/reset-password/${token}`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },
};

// Alerts API
export const alertsAPI = {
  // Get all alerts
  getAlerts: async (status = null) => {
    const queryParam = status ? `?status=${status}` : "";
    return apiCall(`/alerts${queryParam}`);
  },

  // Get alert statistics
  getStats: async () => {
    return apiCall("/alerts/stats");
  },

  // Create new alert
  createAlert: async (alertData) => {
    return apiCall("/alerts", {
      method: "POST",
      body: JSON.stringify(alertData),
    });
  },

  // Update alert status
  updateStatus: async (alertId, status) => {
    return apiCall(`/alerts/${alertId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // Reactivate alert
  reactivateAlert: async (alertId) => {
    return apiCall(`/alerts/${alertId}/reactivate`, {
      method: "POST",
    });
  },

  // Delete alert
  deleteAlert: async (alertId) => {
    return apiCall(`/alerts/${alertId}`, {
      method: "DELETE",
    });
  },

  // Mark alert as seen
  markAsSeen: async (alertId) => {
    return apiCall(`/alerts/${alertId}/seen`, {
      method: "PATCH",
    });
  },

  // Mark all alerts as seen
  markAllAsSeen: async () => {
    return apiCall("/alerts/seen/all", {
      method: "PATCH",
    });
  },
};

// Payments API
export const paymentsAPI = {
  // Get payment service status
  getStatus: async () => {
    return apiCall("/payments/status");
  },

  // Create a new transaction
  createTransaction: async (transactionData) => {
    return apiCall("/payments/transactions", {
      method: "POST",
      body: JSON.stringify(transactionData),
    });
  },

  // Get all my transactions
  getMyTransactions: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/payments/transactions${queryParams ? `?${queryParams}` : ""}`);
  },

  // Get single transaction
  getTransaction: async (transactionId) => {
    return apiCall(`/payments/transactions/${transactionId}`);
  },

  // Process payment
  processPayment: async (transactionId, paymentData) => {
    return apiCall(`/payments/transactions/${transactionId}/pay`, {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  },

  // Confirm order (seller)
  confirmOrder: async (transactionId) => {
    return apiCall(`/payments/transactions/${transactionId}/confirm`, {
      method: "PUT",
    });
  },

  // Mark as delivered (seller)
  markDelivered: async (transactionId) => {
    return apiCall(`/payments/transactions/${transactionId}/deliver`, {
      method: "PUT",
    });
  },

  // Complete transaction (buyer confirms delivery)
  completeTransaction: async (transactionId) => {
    return apiCall(`/payments/transactions/${transactionId}/complete`, {
      method: "PUT",
    });
  },

  // Cancel transaction
  cancelTransaction: async (transactionId, reason) => {
    return apiCall(`/payments/transactions/${transactionId}/cancel`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  },
};

// Reviews API
export const reviewsAPI = {
  // Create a review
  createReview: async (reviewData) => {
    return apiCall("/reviews", {
      method: "POST",
      body: JSON.stringify(reviewData),
    });
  },

  // Get user reviews
  getUserReviews: async (userId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/reviews/user/${userId}${queryParams ? `?${queryParams}` : ""}`);
  },

  // Get my written reviews
  getMyReviews: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiCall(`/reviews/my-reviews${queryParams ? `?${queryParams}` : ""}`);
  },

  // Check if can review a transaction
  canReview: async (transactionId) => {
    return apiCall(`/reviews/can-review/${transactionId}`);
  },
};
