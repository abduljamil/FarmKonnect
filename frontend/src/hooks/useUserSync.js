import { useEffect, useCallback } from 'react';

/**
 * Hook to automatically sync user data from the server
 * This ensures role changes by admin are reflected without re-login
 */
const useUserSync = (user, setUser, navigate) => {
  const syncUserData = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:3000/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid, logout
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          navigate('/signin');
        }
        return;
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        
        // Check if role has changed
        if (currentUser.role !== data.user.role) {
          console.log('User role updated from', currentUser.role, 'to', data.user.role);
          
          // Update sessionStorage
          const updatedUser = {
            ...currentUser,
            ...data.user,
          };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Update state
          if (setUser) {
            setUser(updatedUser);
          }
          
          // Show notification
          alert(`Your role has been updated to: ${data.user.role}`);
          
          // Reload the page to reflect changes in navigation
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error syncing user data:', error);
    }
  }, [navigate, setUser]);

  useEffect(() => {
    if (!user) return;

    // Sync on mount
    syncUserData();

    // Sync when window regains focus
    const handleFocus = () => {
      syncUserData();
    };
    window.addEventListener('focus', handleFocus);

    // Sync periodically (every 30 seconds)
    const interval = setInterval(syncUserData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [user, syncUserData]);

  return { syncUserData };
};

export default useUserSync;
