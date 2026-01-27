import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { healthAPI } from '../utils/api';

const ConnectionContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const ConnectionProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isDBConnected, setIsDBConnected] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      const health = await healthAPI.check();
      setIsConnected(health.status !== 'unreachable');
      setIsDBConnected(health.database === 'connected');
      setLastChecked(new Date());
    } catch {
      setIsConnected(false);
      setIsDBConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  // Check connection on mount and periodically
  useEffect(() => {
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    // Also check when window regains focus
    const handleFocus = () => checkConnection();
    window.addEventListener('focus', handleFocus);

    // Check when coming back online
    const handleOnline = () => checkConnection();
    window.addEventListener('online', handleOnline);

    const handleOffline = () => {
      setIsConnected(false);
    };
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  const value = {
    isConnected,
    isDBConnected,
    lastChecked,
    isChecking,
    checkConnection,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export default ConnectionContext;
