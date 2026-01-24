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

  const notificationRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Listen for new order and order status update notifications
  useEffect(() => {
    if (!user) return;

    // Request notification permission
    if (Notification.permission === "default") {
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
      if (Notification.permission === "granted") {
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
      if (Notification.permission === "granted") {
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
      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
        });
      }
    };

    socketService.onNewOrder(handleNewOrder);
    socketService.onOrderStatusUpdate(handleOrderStatusUpdate);
    socketService.onNewReview(handleNewReview);

    return () => {
      socketService.offNewOrder();
      socketService.offOrderStatusUpdate();
      socketService.offNewReview();
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
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
    setNotificationDropdownOpen(false);
  };

  const handleNotificationClick = async (notification) => {
    if (notification.type === "price_alert") {
      await markAsSeen(notification._id);
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
  const priceAlerts = triggeredAlerts.slice(0, 5).map((alert) => ({
    ...alert,
    type: "price_alert",
  }));

  const recentOrderNotifications = orderNotifications
    .filter((n) => !n.seen)
    .slice(0, 5);

  // All notifications combined and sorted by date
  const allNotifications = [...recentOrderNotifications, ...priceAlerts]
    .sort((a, b) => new Date(b.createdAt || b.triggeredAt) - new Date(a.createdAt || a.triggeredAt))
    .slice(0, 8);

  // Total unseen count
  const totalUnseenCount = unseenCount + orderNotificationCount;

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
    { path: "/admin", label: t("nav.admin"), icon: Shield, show: user?.role === "admin" },
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
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link
            to="/dashboard"
            onClick={closeMobileMenu}
            className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity flex items-center gap-2 flex-shrink-0"
          >
            <span className="text-2xl sm:text-3xl">🌾</span>
            <span className="hidden xs:inline">FarmKonnect</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
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
                          const offset = 58;
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
                  className={`font-medium transition-all duration-200 relative ${(link.scrollTo ? isPriceChartInView : isActive(link.path))
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

            {/* Combined Notifications - Desktop */}
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
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-4">
                      <Link
                        to="/dashboard"
                        onClick={() => setNotificationDropdownOpen(false)}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        Price Alerts
                        <ChevronRight className="w-4 h-4" />
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
                    </div>
                  )}
                </div>
              )}
            </div>

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
            <div className="flex items-center gap-3 ml-2 border-l border-gray-200 dark:border-gray-700 pl-4 lg:pl-6">
              <Link
                to="/profile"
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
                <div className="hidden lg:block">
                  <p className="font-medium text-gray-900 dark:text-white leading-tight">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-primary-600 dark:text-primary-400">
                    {t("profile.title")}
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button & Icons */}
          <div className="flex md:hidden items-center gap-2">
            {/* Notifications - Mobile */}
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

            {/* Messages with badge - Mobile */}
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

            {/* Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 py-4 animate-in slide-in-from-top duration-200">
            {/* User Info - Mobile */}
            <div className="flex items-center gap-3 px-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
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
            <Link
              to="/profile"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="font-medium">{t("profile.title")}</span>
            </Link>

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
    name: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    avatar: PropTypes.string,
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
  unreadCount: PropTypes.number,
};

export default Navbar;
