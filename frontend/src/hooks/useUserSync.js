import { useEffect, useCallback } from 'react';


import API_URL from "../config";

/**
 * Hook to automatically sync user data from the server
 * This ensures role changes by admin are reflected without re-login
 */
const useUserSync = (user, setUser, navigate) => {
  const syncUserData = useCallback(async () => {
    try {
      // Check if user exists in sessionStorage
      const userData = sessionStorage.getItem('user');
      if (!userData) return;

      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Session is invalid, logout
          sessionStorage.removeItem('user');
          navigate('/signin');
        }
        return;
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

        // Role-only diff: merge the fresh server fields into the cached user
        // and update local state. No alert(), no full-page reload — components
        // that read `user.role` via React state will re-render naturally.
        const updatedUser = { ...currentUser, ...data.user };
        const shapeChanged =
          currentUser.role !== data.user.role ||
          currentUser.isEmailVerified !== data.user.isEmailVerified;

        if (shapeChanged) {
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          if (setUser) setUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Error syncing user data:', error);
    }
  }, [navigate, setUser]);

  useEffect(() => {
    if (!user) return;

    // Sync once on mount, then every 5 min. The aggressive 30-sec poll +
    // focus-rebroadcast was hammering /auth/me from every page — 12 calls
    // per minute per tab — without buying meaningful freshness for role
    // changes (which happen rarely and are admin-driven).
    syncUserData();
    const interval = setInterval(syncUserData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, syncUserData]);

  return { syncUserData };
};

export default useUserSync;
