
import React, { useEffect, useState } from 'react';
import { NotificationMessage } from '../types';

interface NotificationProps extends NotificationMessage {
  onDismiss?: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, 3000); // Auto-dismiss after 3 seconds

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [message, onDismiss]); // Re-run effect if message or onDismiss changes

  if (!visible || !message) return null;

  const baseClasses = "fixed top-5 right-5 p-4 rounded-md shadow-lg text-sm z-50 transition-all duration-300 ease-in-out max-w-md";
  const typeClasses = {
    success: "bg-green-600 text-white border border-green-700",
    error: "bg-red-600 text-white border border-red-700",
    info: "bg-sky-600 text-white border border-sky-700",
  };

  return (
    <div 
      className={`${baseClasses} ${typeClasses[type]} ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && ( // Provide a manual dismiss option
           <button 
             onClick={() => { setVisible(false); if (onDismiss) onDismiss(); }} 
             className="ml-4 text-lg font-bold hover:text-slate-200 focus:outline-none"
             aria-label="Dismiss notification"
           >
             &times;
           </button>
        )}
      </div>
    </div>
  );
};
