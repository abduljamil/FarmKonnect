import API_URL from "../config";

// Helper function to check if user is authenticated by checking /api/auth/me
export const checkAuth = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: "include",
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Auth check failed:", error);
    return null;
  }
};

// Logout function that calls the backend logout endpoint
export const logout = async () => {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    
    // Clear user data from sessionStorage
    sessionStorage.removeItem("user");
    
    return { success: true };
  } catch (error) {
    console.error("Logout failed:", error);
    // Still clear local data even if API call fails
    sessionStorage.removeItem("user");
    return { success: false, error };
  }
};

// Get user from sessionStorage (for display purposes)
export const getUserFromStorage = () => {
  const userData = sessionStorage.getItem("user");
  return userData ? JSON.parse(userData) : null;
};
