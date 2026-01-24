import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';

const GlobalNotificationToast = () => {
    const { notifications, removeNotification } = useNotifications();

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`
            pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-white w-80 transform transition-all duration-300 ease-in-out
            ${notification.type === 'error' ? 'bg-red-500' :
                            notification.type === 'success' ? 'bg-green-500' :
                                notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}
            flex justify-between items-center opacity-90 hover:opacity-100
          `}
                    role="alert"
                >
                    <p className="text-sm font-medium">{notification.message}</p>
                    <button
                        onClick={() => removeNotification(notification.id)}
                        className="ml-4 text-white hover:text-gray-200 focus:outline-none"
                        aria-label="Close notification"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
};

export default GlobalNotificationToast;
