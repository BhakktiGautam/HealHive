import React from 'react';
import { Check, Loader, AlertCircle, Save } from 'lucide-react';

const SaveStatusIndicator = ({ status, lastSaved, className = '' }) => {
  const statusConfig = {
    idle: {
      icon: Save,
      text: 'Draft will be auto-saved',
      color: 'text-gray-400',
      bg: 'bg-gray-50',
    },
    saving: {
      icon: Loader,
      text: 'Saving draft...',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      animate: 'animate-spin',
    },
    saved: {
      icon: Check,
      text: lastSaved 
        ? `Draft saved ${new Date(lastSaved).toLocaleTimeString()}`
        : 'Draft saved',
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    error: {
      icon: AlertCircle,
      text: 'Error saving draft',
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
  };

  const config = statusConfig[status] || statusConfig.idle;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} ${className}`}>
      <Icon className={`w-4 h-4 ${config.color} ${config.animate || ''}`} />
      <span className={`text-sm ${config.color}`}>{config.text}</span>
    </div>
  );
};

export default SaveStatusIndicator;