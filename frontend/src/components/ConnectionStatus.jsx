import React from 'react';
import { useConnection } from '../contexts/ConnectionContext';
import { WifiOff, Database, RefreshCw } from 'lucide-react';

const ConnectionStatus = () => {
  const { isConnected, isDBConnected, isChecking, checkConnection } = useConnection();

  // Don't show anything if everything is fine
  if (isConnected && isDBConnected) {
    return null;
  }

  const getMessage = () => {
    if (!isConnected) {
      return {
        icon: WifiOff,
        title: 'Connection Lost',
        message: 'Unable to connect to the server. Please check your internet connection.',
        color: 'red',
      };
    }
    if (!isDBConnected) {
      return {
        icon: Database,
        title: 'Service Degraded',
        message: 'Some features may be temporarily unavailable. We\'re working on it.',
        color: 'yellow',
      };
    }
    return null;
  };

  const status = getMessage();
  if (!status) return null;

  const Icon = status.icon;
  const bgColor = status.color === 'red'
    ? 'bg-red-500 dark:bg-red-600'
    : 'bg-yellow-500 dark:bg-yellow-600';

  return (
    <div className={`fixed top-16 sm:top-20 left-0 right-0 z-40 ${bgColor} text-white px-4 py-2 shadow-lg`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 flex-shrink-0" />
          <div>
            <span className="font-medium">{status.title}:</span>{' '}
            <span className="text-sm opacity-90">{status.message}</span>
          </div>
        </div>
        <button
          onClick={checkConnection}
          disabled={isChecking}
          className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Retry'}
        </button>
      </div>
    </div>
  );
};

export default ConnectionStatus;
