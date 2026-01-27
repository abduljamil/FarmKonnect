import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socketService from '../utils/socket';

const NotificationContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [triggeredAlerts, setTriggeredAlerts] = useState([]);
    const [unseenCount, setUnseenCount] = useState(0);

    // Request notification permission on mount
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Show browser notification for price alerts
    const showBrowserNotification = useCallback((alert) => {
        if (!("Notification" in window)) {
            return;
        }

        if (Notification.permission !== "granted") {
            // Try to request permission
            Notification.requestPermission();
            return;
        }

        const title = "🔔 Price Alert Triggered!";
        const body = `${alert.commodity}${alert.variety ? ` (${alert.variety})` : ""} is now ₨${alert.currentPrice?.toLocaleString()} - ${alert.condition === "above" ? "rose above" : "dropped below"} ₨${alert.targetPrice?.toLocaleString()}`;

        try {
            const notification = new Notification(title, {
                body,
                icon: "/farmkonnect.svg",
                badge: "/farmkonnect.svg",
                tag: `price-alert-${alert._id}`,
                requireInteraction: false,
                silent: false,
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Auto close after 8 seconds
            setTimeout(() => notification.close(), 8000);
        } catch (error) {
            console.error("Error showing notification:", error);
        }
    }, []);

    // Handler for price alerts
    const handlePriceAlert = useCallback((data) => {
        // console.log("Price alert received:", data);
        if (data && data.alert) {
            setTriggeredAlerts(prev => [data.alert, ...prev].slice(0, 20));
            setUnseenCount(prev => prev + 1);
            // Show browser notification
            showBrowserNotification(data.alert);
        }
    }, [showBrowserNotification]);

    // Listen for price alert notifications via socket
    useEffect(() => {
        // Set up the listener with unique ID
        socketService.onPriceAlertTriggered(handlePriceAlert, "notification_context");

        // Try to connect socket if user is logged in
        // With cookie-based auth, we don't strictly need a token
        const userData = sessionStorage.getItem("user");
        if (userData) {
            try {
                const user = JSON.parse(userData);
                // Connect with token if available, otherwise connect without (will use cookies)
                socketService.connect(user.token || "");
            } catch (e) {
                console.error("Error parsing user data:", e);
                socketService.connect("");
            }
        }

        return () => {
            socketService.offPriceAlertTriggered("notification_context");
        };
    }, [handlePriceAlert]);

    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 5000);
    };

    const removeNotification = (id) => {
        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    };

    const markAsSeen = (alertId) => {
        setTriggeredAlerts(prev =>
            prev.map(alert =>
                (alert && alert._id === alertId) ? { ...alert, seen: true } : alert
            )
        );
        setUnseenCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsSeen = () => {
        setTriggeredAlerts(prev =>
            prev.map(alert => ({ ...alert, seen: true }))
        );
        setUnseenCount(0);
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            addNotification,
            removeNotification,
            triggeredAlerts,
            unseenCount,
            markAsSeen,
            markAllAsSeen
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
