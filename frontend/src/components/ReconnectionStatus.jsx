import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

const ReconnectionStatus = ({
  isConnected,
  isReconnecting,
  reconnectAttempts,
  lastError,
  onReconnect,
}) => {
  if (isConnected && !isReconnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <Wifi className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">Connected</span>
        <span className="text-xs text-green-600 ml-1">● Live</span>
      </div>
    );
  }

  if (isReconnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg animate-pulse">
        <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
        <span className="text-sm font-medium text-yellow-700">
          Reconnecting...
        </span>
        <span className="text-xs text-yellow-600 ml-1">
          Attempt {reconnectAttempts} of 10
        </span>
      </div>
    );
  }

  if (lastError) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium text-red-700">
          Connection Lost
        </span>
        <button
          onClick={onReconnect}
          className="ml-2 px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition"
        >
          Reconnect Now
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
      <WifiOff className="h-4 w-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">Disconnected</span>
      <button
        onClick={onReconnect}
        className="ml-2 px-3 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
      >
        Connect
      </button>
    </div>
  );
};

export default ReconnectionStatus;