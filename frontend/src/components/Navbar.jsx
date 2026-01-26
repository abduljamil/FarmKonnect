import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useLanguage } from "../contexts/LanguageContext";
import socketService from "../utils/socket";
import {
  Menu,
  X,
  Home,
  ShoppingBag,
  MessageCircle,
  Shield,
  Sun,
  Moon,
  User,
  Bell,
  TrendingUp,
  TrendingDown,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Package,
  Star,
  LifeBuoy,
} from "lucide-react";

const Navbar = ({ user, onLogout, unreadCount = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { triggeredAlerts, unseenCount, markAllAsSeen, markAsSeen } = useNotifications();
  const { t, language, toggleLanguage, isUrdu } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [isPriceChartInView, setIsPriceChartInView] = useState(false);

  // Order notifications state
  const [orderNotifications, setOrderNotifications] = useState([]);
  const [orderNotificationCount, setOrderNotificationCount] = useState(0);

  // Support ticket notifications state
  const [supportNotifications, setSupportNotifications] = useState([]);
  const [supportNotificationCount, setSupportNotificationCount] = useState(0);

  const notificationRef = useRef(null);
  const mobileNotificationRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Listen for new order and order status update notifications
  useEffect(() => {
    if (!user) return;

    // Connect socket - with cookie-based auth, we don't need a token
    // The socket will use withCredentials: true to send cookies
    const userData = sessionStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Connect with token if available, otherwise connect without (will use cookies)
        socketService.connect(parsedUser.token || "");
      } catch (e) {
        console.error("Error parsing user data for socket:", e);
        // Still try to connect without token (will use cookies)
        socketService.connect("");
      }
    } else {
      // Connect without token (will use cookies)
      socketService.connect("");
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Handle new order
    const handleNewOrder = (order) => {
      const notification = {
        id: `order-${order.transactionId}-${Date.now()}`,
        type: "new_order",
        transactionId: order.transactionId,
        title: "New Order Received! 🎉",
        message: `${order.buyerName} placed an order for ${order.listingTitle}`,
        listingTitle: order.listingTitle,
        amount: order.amount,
        quantity: order.quantity,
        createdAt: order.createdAt || new Date(),
        seen: false,
      };

      setOrderNotifications((prev) => [notification, ...prev].slice(0, 20));
      setOrderNotificationCount((prev) => prev + 1);

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
        });
      }
    };

    // Handle order status update
    const handleOrderStatusUpdate = (update) => {
      const statusMessages = {
        confirmed: "Order confirmed",
        delivered: "Order marked as delivered",
        completed: "Order completed",
        cancelled: "Order cancelled",
      };

      const notification = {
        id: `status-${update.transactionId}-${Date.now()}`,
        type: "status_update",
        transactionId: update.transactionId,
        title: `Order ${update.newStatus.charAt(0).toUpperCase() + update.newStatus.slice(1)}`,
        message: update.message || statusMessages[update.newStatus] || `Order status changed to ${update.newStatus}`,
        listingTitle: update.listingTitle,
        newStatus: update.newStatus,
        createdAt: update.createdAt || new Date(),
        seen: false,
      };

      setOrderNotifications((prev) => [notification, ...prev].slice(0, 20));
      setOrderNotificationCount((prev) => prev + 1);

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
        });
      }
    };

    // Handle new review
    const handleNewReview = (review) => {
      const notification = {
        id: `review-${review.reviewId}-${Date.now()}`,
        type: "review",
        reviewId: review.reviewId,
        title: "New Review Received! ⭐",
        message: review.message || `${review.reviewerName} gave you a ${review.rating}-star review`,
        reviewerName: review.reviewerName,
        rating: review.rating,
        listingTitle: review.listingTitle,
        createdAt: review.createdAt || new Date(),
        seen: false,
      };

      setOrderNotifications((prev) => [notification, ...prev].slice(0, 20));
      setOrderNotificationCount((prev) => prev + 1);

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
        });
      }
    };

    // Handle support ticket update (for users - when admin replies)
    const handleSupportUpdate = (data) => {
      const notification = {
        id: `support-${data.ticketId}-${Date.now()}`,
        type: "support",
        ticketId: data.ticketId,
        title: data.newStatus ? "Ticket Status Updated" : "Support Reply",
        message: data.message,
        subject: data.subject,
        newStatus: data.newStatus,
        createdAt: data.createdAt || new Date(),
        seen: false,
      };

      setSupportNotifications((prev) => [notification, ...prev].slice(0, 20));
      setSupportNotificationCount((prev) => prev + 1);

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
        });
      }
    };

    // Handle admin notification (for admins - when user creates/replies to ticket)
    const handleAdminNotification = (data) => {
      if (data.type === "support_ticket" || data.type === "support_reply") {
        const notification = {
          id: `admin-support-${data.ticketId}-${Date.now()}`,
          type: "admin_support",
          ticketId: data.ticketId,
          title: data.type === "support_ticket" ? "New Support Ticket" : "Ticket Reply",
          message: data.message,
          subject: data.subject,
          userName: data.userName,
          category: data.category,
          createdAt: data.createdAt || new Date(),
          seen: false,
        };

        setSupportNotifications((prev) => [notification, ...prev].slice(0, 20));
        setSupportNotificationCount((prev) => prev + 1);

        // Show browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(notification.title, {
            body: notification.message,
            icon: "/favicon.ico",
          });
        }
      }
    };

    socketService.onNewOrder(handleNewOrder);
    socketService.onOrderStatusUpdate(handleOrderStatusUpdate, "navbar");
    socketService.onNewReview(handleNewReview);
    socketService.onSupportUpdate(handleSupportUpdate);
    socketService.onAdminNotification(handleAdminNotification);

    return () => {
      socketService.offNewOrder();
      socketService.offOrderStatusUpdate("navbar");
      socketService.offNewReview();
      socketService.offSupportUpdate();
      socketService.offAdminNotification();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedDesktop = notificationRef.current && notificationRef.current.contains(event.target);
      const clickedMobile = mobileNotificationRef.current && mobileNotificationRef.current.contains(event.target);

      if (!clickedDesktop && !clickedMobile) {
        setNotificationDropdownOpen(false);
      }
    };

    if (notificationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationDropdownOpen]);

  // Listen for custom event to reset support notifications (from Admin panel)
  useEffect(() => {
    const handleResetSupportNotifications = () => {
      setSupportNotificationCount(0);
      setSupportNotifications((prev) => prev.map((n) => ({ ...n, seen: true })));
    };

    window.addEventListener("resetSupportNotifications", handleResetSupportNotifications);

    return () => {
      window.removeEventListener("resetSupportNotifications", handleResetSupportNotifications);
    };
  }, []);

  // Track if price chart is in view
  useEffect(() => {
    const chartElement = document.getElementById('price-chart');
    if (!chartElement) {
      setIsPriceChartInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPriceChartInView(entry.isIntersecting);
      },
      { threshold: 0.3 }
    );

    observer.observe(chartElement);

    return () => {
      observer.disconnect();
    };
  }, [location.pathname]);

  const handleMarkAllAsSeen = async () => {
    await markAllAsSeen();
    // Also clear order notifications
    setOrderNotifications((prev) => prev.map((n) => ({ ...n, seen: true })));
    setOrderNotificationCount(0);
    // Also clear support notifications
    setSupportNotifications((prev) => prev.map((n) => ({ ...n, seen: true })));
    setSupportNotificationCount(0);
    setNotificationDropdownOpen(false);
  };

  const handleNotificationClick = async (notification) => {
    if (notification.type === "price_alert") {
      await markAsSeen(notification._id);
    } else if (notification.type === "message") {
      // Navigate to chat page
      navigate("/chat");
      setNotificationDropdownOpen(false);
    } else if (notification.type === "support" || notification.type === "admin_support") {
      // Mark support notification as seen
      setSupportNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, seen: true } : n))
      );
      setSupportNotificationCount((prev) => Math.max(0, prev - 1));
      // Navigate to admin panel for admins, or support page for users with ticket ID
      if (notification.type === "admin_support") {
        navigate(`/admin?tab=support&ticket=${notification.ticketId}`);
      } else {
        navigate(`/support?ticket=${notification.ticketId}`);
      }
      setNotificationDropdownOpen(false);
    } else {
      // Mark order notification as seen
      setOrderNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, seen: true } : n))
      );
      setOrderNotificationCount((prev) => Math.max(0, prev - 1));
      // Navigate to transactions page
      navigate("/transactions");
      setNotificationDropdownOpen(false);
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Combine price alerts and order notifications for the dropdown
  const priceAlerts = (triggeredAlerts || []).slice(0, 5).map((alert) => ({
    ...alert,
    type: "price_alert",
  }));

  const recentOrderNotifications = orderNotifications
    .filter((n) => !n.seen)
    .slice(0, 5);

  const recentSupportNotifications = supportNotifications
    .filter((n) => !n.seen)
    .slice(0, 5);

  // Message notification entry if there are unread messages
  const messageNotifications = unreadCount > 0 ? [{
    id: "messages-unread",
    type: "message",
    title: `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`,
    message: "You have new messages in your inbox",
    createdAt: new Date(),
    seen: false,
  }] : [];

  // All notifications combined and sorted by date
  const allNotifications = [...messageNotifications, ...recentSupportNotifications, ...recentOrderNotifications, ...priceAlerts]
    .sort((a, b) => new Date(b.createdAt || b.triggeredAt) - new Date(a.createdAt || a.triggeredAt))
    .slice(0, 8);

  // Total unseen count (including unread messages and support notifications)
  const totalUnseenCount = (unseenCount || 0) + orderNotificationCount + (unreadCount || 0) + supportNotificationCount;

  const navLinks = [
    { path: "/dashboard", label: t("nav.dashboard"), icon: Home, show: true, scrollToTop: true },
    {
      path: "/dashboard",
      label: t("dashboard.priceChart.title"),
      icon: TrendingUp,
      show: true,
      scrollTo: "price-chart"
    },
    { path: "/listings", label: t("nav.marketplace"), icon: ShoppingBag, show: true },
    {
      path: "/chat",
      label: t("nav.messages"),
      icon: MessageCircle,
      show: true,
      badge: unreadCount,
    },
    {
      path: "/transactions",
      label: t("nav.orders") || "Orders",
      icon: ClipboardList,
      show: true,
      badge: orderNotificationCount,
    },
    {
      path: "/admin",
      label: t("nav.admin"),
      icon: Shield,
      show: user?.role === "admin",
      badge: supportNotificationCount,
    },
  ];

  // Get status color for order notifications
  const getStatusColor = (status) => {
    const colors = {
      new_order: "text-green-500",
      confirmed: "text-blue-500",
      delivered: "text-purple-500",
      completed: "text-green-500",
      cancelled: "text-red-500",
      paid: "text-emerald-600",
    };
    return colors[status] || "text-gray-500";
  };

  const getStatusIcon = (type, status) => {
    if (type === "price_alert") {
      return null; // Will use TrendingUp/Down based on condition
    }
    return <Package className="w-4 h-4" />;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link
            to="/dashboard"
            onClick={closeMobileMenu}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <span className="text-3xl">🌾</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              FarmKonnect
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center gap-5">
            {navLinks
              .filter((link) => link.show)
              .map((link) => (
                <Link
                  key={link.path + link.label}
                  to={link.path}
                  onClick={(e) => {
                    if (link.scrollTo) {
                      e.preventDefault();
                      navigate(link.path);
                      setTimeout(() => {
                        const element = document.getElementById(link.scrollTo);
                        if (element) {
                          const offset = 100;
                          const elementPosition = element.getBoundingClientRect().top;
                          const offsetPosition = elementPosition + window.pageYOffset - offset;
                          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                        }
                      }, 100);
                    } else if (link.scrollToTop) {
                      e.preventDefault();
                      navigate(link.path);
                      setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }, 100);
                    }
                    // Reset order count when clicking Orders
                    if (link.path === "/transactions") {
                      setOrderNotificationCount(0);
                    }
                  }}
                  className={`font-medium transition-all duration-200 relative whitespace-nowrap ${(link.scrollTo ? isPriceChartInView : isActive(link.path))
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                    }`}
                >
                  {link.label}
                  {link.badge > 0 && (
                    <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-lg animate-pulse">
                      {link.badge > 99 ? "99+" : link.badge}
                    </span>
                  )}
                </Link>
              ))}

            {/* Combined Notifications - Desktop (only for logged-in users) */}
            {user && (
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                className="relative p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {totalUnseenCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-lg animate-pulse">
                    {totalUnseenCount > 99 ? "99+" : totalUnseenCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notificationDropdownOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-[520px] overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                    {totalUnseenCount > 0 && (
                      <button
                        onClick={handleMarkAllAsSeen}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="overflow-y-auto flex-1">
                    {allNotifications.length > 0 ? (
                      allNotifications.map((notification, index) => (
                        <div
                          key={notification.id || notification._id || index}
                          onClick={() => handleNotificationClick(notification)}
                          className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 ${(notification.type === "price_alert" && !notification.seen) ||
                            (notification.type !== "price_alert" && !notification.seen)
                            ? "bg-blue-50/50 dark:bg-blue-900/10"
                            : ""
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={`flex-shrink-0 mt-1 ${notification.type === "price_alert"
                              ? notification.condition === "above"
                                ? "text-green-500"
                                : "text-yellow-500"
                              : notification.type === "review"
                                ? "text-yellow-500"
                                : notification.type === "message"
                                  ? "text-primary-500"
                                  : notification.type === "support" || notification.type === "admin_support"
                                    ? "text-purple-500"
                                    : getStatusColor(notification.newStatus || "new_order")
                              }`}>
                              {notification.type === "price_alert" ? (
                                notification.condition === "above" ? (
                                  <TrendingUp className="w-4 h-4" />
                                ) : (
                                  <TrendingDown className="w-4 h-4" />
                                )
                              ) : notification.type === "review" ? (
                                <Star className="w-4 h-4 fill-current" />
                              ) : notification.type === "message" ? (
                                <MessageCircle className="w-4 h-4" />
                              ) : notification.type === "support" || notification.type === "admin_support" ? (
                                <LifeBuoy className="w-4 h-4" />
                              ) : (
                                <Package className="w-4 h-4" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {notification.type === "price_alert" ? (
                                <>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {notification.commodity}
                                    {notification.variety && ` (${notification.variety})`}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    ₨{notification.currentPrice?.toLocaleString()} {notification.condition === "above" ? "↑" : "↓"} ₨{notification.targetPrice?.toLocaleString()}
                                  </p>
                                  {notification.city && (
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                      📍 {notification.city}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    {notification.message}
                                  </p>
                                  {notification.listingTitle && (
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                      {notification.type === "review" ? "⭐ " : "📦 "}{notification.listingTitle}
                                    </p>
                                  )}
                                </>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {formatTimeAgo(notification.createdAt || notification.triggeredAt)}
                              </p>
                            </div>

                            {/* Unseen indicator */}
                            {!notification.seen && (
                              <div className="flex-shrink-0">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {allNotifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-4 flex-wrap">
                      <Link
                        to="/chat"
                        onClick={() => setNotificationDropdownOpen(false)}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        Messages
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-1.5">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/transactions"
                        onClick={() => {
                          setNotificationDropdownOpen(false);
                          setOrderNotificationCount(0);
                        }}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        Orders
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                      <Link
                        to={user?.role === "admin" ? "/admin?tab=support" : "/support"}
                        onClick={() => {
                          setNotificationDropdownOpen(false);
                          setSupportNotificationCount(0);
                        }}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        Support
                        {supportNotificationCount > 0 && (
                          <span className="bg-purple-500 text-white text-xs rounded-full px-1.5">
                            {supportNotificationCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setNotificationDropdownOpen(false)}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        Price Alerts
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Dark Mode Toggle - Desktop */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {/* Language Toggle - Desktop */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-sm hover:shadow-md"
              aria-label="Toggle language"
              title={isUrdu ? "Switch to English" : "اردو میں تبدیل کریں"}
            >
              <span className="text-sm font-bold text-white">
                {isUrdu ? "EN" : "اردو"}
              </span>
            </button>

            {/* User Info - Desktop */}
            <div className="flex items-center gap-3 ml-2 border-l border-gray-200 dark:border-gray-700 pl-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        user?.name?.charAt(0).toUpperCase() || "U"
                      )}
                    </div>
                    <div className="hidden xl:block">
                      <p className="font-medium text-gray-900 dark:text-white leading-tight">
                        {user?.name || "User"}
                      </p>
                    </div>
                  </Link>
                  {/* Logout Button - Desktop */}
                  <button
                    onClick={onLogout}
                    className="relative p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Logout"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/signin"
                    className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 font-medium bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button & Icons */}
          <div className="flex xl:hidden items-center gap-2">
            {/* Notifications - Mobile (only for logged-in users) */}
            {user && (
              <div className="relative" ref={mobileNotificationRef}>
                <button
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                  className="relative p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {totalUnseenCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-lg animate-pulse">
                      {totalUnseenCount > 99 ? "99+" : totalUnseenCount}
                    </span>
                  )}
                </button>

                {/* Mobile Notification Dropdown */}
                {notificationDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-[70vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Notifications
                      </h3>
                      {totalUnseenCount > 0 && (
                        <button
                          onClick={handleMarkAllAsSeen}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto flex-1">
                      {allNotifications.length > 0 ? (
                        allNotifications.map((notification, index) => (
                          <div
                            key={notification.id || notification._id || index}
                            onClick={() => handleNotificationClick(notification)}
                            className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 ${(notification.type === "price_alert" && !notification.seen) ||
                              (notification.type !== "price_alert" && !notification.seen)
                              ? "bg-blue-50/50 dark:bg-blue-900/10"
                              : ""
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className={`flex-shrink-0 mt-1 ${notification.type === "price_alert"
                                ? notification.condition === "above"
                                  ? "text-green-500"
                                  : "text-yellow-500"
                                : notification.type === "review"
                                  ? "text-yellow-500"
                                  : notification.type === "message"
                                    ? "text-primary-500"
                                    : notification.type === "support" || notification.type === "admin_support"
                                      ? "text-purple-500"
                                      : getStatusColor(notification.newStatus || "new_order")
                                }`}>
                                {notification.type === "price_alert" ? (
                                  notification.condition === "above" ? (
                                    <TrendingUp className="w-4 h-4" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4" />
                                  )
                                ) : notification.type === "review" ? (
                                  <Star className="w-4 h-4 fill-current" />
                                ) : notification.type === "message" ? (
                                  <MessageCircle className="w-4 h-4" />
                                ) : notification.type === "support" || notification.type === "admin_support" ? (
                                  <LifeBuoy className="w-4 h-4" />
                                ) : (
                                  <Package className="w-4 h-4" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {notification.type === "price_alert" ? (
                                  <>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {notification.commodity}
                                      {notification.variety && ` (${notification.variety})`}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                      ₨{notification.currentPrice?.toLocaleString()} {notification.condition === "above" ? "↑" : "↓"} ₨{notification.targetPrice?.toLocaleString()}
                                    </p>
                                    {notification.city && (
                                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                        📍 {notification.city}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {notification.title}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    {notification.listingTitle && (
                                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                        {notification.type === "review" ? "⭐ " : "📦 "}{notification.listingTitle}
                                      </p>
                                    )}
                                  </>
                                )}
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  {formatTimeAgo(notification.createdAt || notification.triggeredAt)}
                                </p>
                              </div>

                              {/* Unseen indicator */}
                              {!notification.seen && (
                                <div className="flex-shrink-0">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {allNotifications.length > 0 && (
                      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-3 flex-wrap">
                        <Link
                          to="/chat"
                          onClick={() => setNotificationDropdownOpen(false)}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                        >
                          Messages
                          {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-1.5">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          to="/transactions"
                          onClick={() => {
                            setNotificationDropdownOpen(false);
                            setOrderNotificationCount(0);
                          }}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                        >
                          Orders
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                        <Link
                          to={user?.role === "admin" ? "/admin?tab=support" : "/support"}
                          onClick={() => {
                            setNotificationDropdownOpen(false);
                            setSupportNotificationCount(0);
                          }}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                        >
                          Support
                          {supportNotificationCount > 0 && (
                            <span className="bg-purple-500 text-white text-xs rounded-full px-1.5">
                              {supportNotificationCount}
                            </span>
                          )}
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Messages with badge - Mobile (only for logged-in users) */}
            {user && (
              <Link
                to="/chat"
                className="relative p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-lg">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Dark Mode Toggle - Mobile */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {/* Language Toggle - Mobile */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-sm"
              aria-label="Toggle language"
            >
              <span className="text-xs font-bold text-white">
                {isUrdu ? "EN" : "اردو"}
              </span>
            </button>

            {/* Hamburger Menu - Using raw SVG to ensure visibility */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden relative z-50 p-2 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-2 block w-10 h-10 flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-gray-200 dark:border-gray-800 py-4 animate-in slide-in-from-top duration-200">
            {/* User Info - Mobile */}
            {user ? (
              <>
                <div className="flex items-center gap-3 px-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      user?.name?.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user?.name || "User"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {user?.role || "user"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mb-2">
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">{t("profile.title")}</span>
                  </Link>
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      onLogout();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3 px-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                <Link
                  to="/signin"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Navigation Links - Mobile */}
            <div className="space-y-1">
              {navLinks
                .filter((link) => link.show)
                .map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path + link.label}
                      to={link.path}
                      onClick={(e) => {
                        if (link.scrollTo) {
                          e.preventDefault();
                          navigate(link.path);
                          closeMobileMenu();
                          setTimeout(() => {
                            const element = document.getElementById(link.scrollTo);
                            if (element) {
                              const offset = 100;
                              const elementPosition = element.getBoundingClientRect().top;
                              const offsetPosition = elementPosition + window.pageYOffset - offset;
                              window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                            }
                          }, 100);
                        } else if (link.scrollToTop) {
                          e.preventDefault();
                          navigate(link.path);
                          closeMobileMenu();
                          setTimeout(() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }, 100);
                        } else {
                          closeMobileMenu();
                        }
                        // Reset order count when clicking Orders
                        if (link.path === "/transactions") {
                          setOrderNotificationCount(0);
                        }
                      }}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${(link.scrollTo ? isPriceChartInView : isActive(link.path))
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{link.label}</span>
                      {link.badge > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-2 flex items-center justify-center">
                          {link.badge > 99 ? "99+" : link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
    avatar: PropTypes.string,
  }),
  onLogout: PropTypes.func,
  unreadCount: PropTypes.number,
};

export default Navbar;
