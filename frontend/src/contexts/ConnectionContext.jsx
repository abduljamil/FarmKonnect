import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

  // Use a ref for the in-flight flag so checkConnection doesn't need to be
  // recreated each time it changes. Previously, every state flip caused the
  // useEffect to tear down + restart the 30s interval — useless thrash.
  const inFlightRef = useRef(false);

  const checkConnection = useCallback(async () => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
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
      inFlightRef.current = false;
    }
  }, []);

  // Check connection on mount and periodically. `checkConnection` is stable
  // (empty deps) so this effect now runs ONCE on mount, not on every state
  // change.
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 60000); // 60s, was 30s

    const handleFocus = () => checkConnection();
    window.addEventListener('focus', handleFocus);

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
