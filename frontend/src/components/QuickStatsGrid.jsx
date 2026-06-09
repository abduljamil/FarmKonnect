import React, { useEffect, useState } from "react";
import {
  Package,
  MessageCircle,
  TrendingUp,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import API_URL from "../config";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import { alertsAPI } from "../utils/api";
import axios from "axios";
import { useLanguage } from "../contexts/LanguageContext";

const StatCard = ({
  title,
  value,
  subtitle,
  icon: IconComponent, // eslint-disable-line no-unused-vars
  trend,
  color,
  onClick,
  delay = 0
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const getTrendIcon = () => {
    if (trend > 0) return <ArrowUpRight className="w-3.5 h-3.5" />;
    if (trend < 0) return <ArrowDownRight className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
  };

  const getTrendColor = () => {
    if (trend > 0) return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
    if (trend < 0) return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
    return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700";
  };

  const colorStyles = {
    emerald: "bg-gradient-to-br from-primary-100 to-emerald-50 dark:from-primary-900/40 dark:to-emerald-900/20 text-primary-600 dark:text-primary-400",
    blue: "bg-gradient-to-br from-blue-100 to-sky-50 dark:from-blue-900/40 dark:to-sky-900/20 text-blue-600 dark:text-blue-400",
    purple: "bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-900/40 dark:to-purple-900/20 text-violet-600 dark:text-violet-400",
    amber: "bg-gradient-to-br from-amber-100 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/20 text-amber-600 dark:text-amber-400",
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white dark:bg-gray-800 rounded-2xl p-5 dash-card
        hover:shadow-lg transition-all duration-300
        ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Top row: icon chip + trend pill */}
      <div className="flex items-center justify-between">
        <div className={`inline-flex p-2.5 rounded-xl ${colorStyles[color]}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="tabular-nums">{Math.abs(trend)}%</span>
          </span>
        )}
      </div>

      {/* Value */}
      <p className="mt-4 text-3xl font-extrabold tracking-tight tabular-nums text-gray-900 dark:text-white">
        {value}
      </p>

      {/* Title */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
        {title}
      </p>

      {/* Subtitle (when there is no trend) */}
      {trend === undefined && subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
          {subtitle}
        </p>
      )}

      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5 pointer-events-none">
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${color === 'emerald' ? 'from-emerald-500' :
          color === 'blue' ? 'from-blue-500' :
            color === 'purple' ? 'from-purple-500' :
              'from-amber-500'
          } to-transparent blur-2xl`} />
      </div>
    </div>
  );
};

const QuickStatsGrid = ({ user, unreadCount = 0 }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { triggeredAlerts } = useNotifications();
  const [stats, setStats] = useState({
    activeListings: 0,
    messages: unreadCount,
    marketTrend: 0,
    alerts: 0,
    loading: true,
  });

  // Fetch real stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      let activeAlerts = 0;
      let activeListings = 0;
      let marketTrend = 0;

      // Fetch user-specific stats only if logged in
      if (user) {
        try {
          // Fetch alert statistics
          try {
            const alertStatsRes = await alertsAPI.getStats();
            activeAlerts = alertStatsRes?.data?.active || 0;
          } catch (err) {
            console.error("Error fetching alert stats:", err);
          }

          // Fetch listings count - only active status
          try {
            const listingsRes = await axios.get(`${API_URL}/listings/my/listings?status=active`, {
              withCredentials: true,
            });
            const total = listingsRes?.data?.pagination?.total || 0;
            activeListings = total;
          } catch (err) {
            console.error("Error fetching listings:", err);
          }
        } catch (error) {
          console.error("Error fetching user stats:", error);
        }
      }

      // Always fetch market trend (public data)
      try {
        // Get all latest prices (one per commodity/city combination)
        const latestRes = await axios.get(`${API_URL}/prices/latest?limit=100`, {
          withCredentials: true,
        });

        const latestData = latestRes?.data?.data || latestRes?.data || [];

        if (Array.isArray(latestData) && latestData.length > 0) {
          // Get diverse samples from different cities and commodities
          const seenKeys = new Set();
          const samples = [];

          for (const item of latestData) {
            // Unique by commodity-city-variety combination
            const key = `${item.commodity}-${item.city}-${item.variety || 'null'}`;
            if (!seenKeys.has(key)) {
              samples.push(item);
              seenKeys.add(key);
              if (samples.length >= 25) break;
            }
          }

          // Fetch all price histories in parallel (30 days for better trend detection)
          const historyPromises = samples.map(sample => {
            let url = `${API_URL}/prices/history?commodity=${encodeURIComponent(sample.commodity)}&city=${encodeURIComponent(sample.city)}&days=30`;
            if (sample.variety !== null && sample.variety !== undefined) {
              url += `&variety=${encodeURIComponent(sample.variety)}`;
            }
            return axios.get(url, { withCredentials: true }).catch(() => null);
          });

          const historyResults = await Promise.all(historyPromises);

          const trends = [];

          historyResults.forEach((result) => {
            if (!result) return;

            const prices = result?.data?.data || result?.data || [];

            if (Array.isArray(prices) && prices.length >= 2) {
              // Sort by date (oldest first)
              const sortedPrices = [...prices].sort((a, b) => new Date(a.date) - new Date(b.date));

              // Get oldest and newest price
              const oldestPrice = sortedPrices[0]?.price || 0;
              const newestPrice = sortedPrices[sortedPrices.length - 1]?.price || 0;

              if (oldestPrice > 0 && newestPrice > 0 && oldestPrice !== newestPrice) {
                const trend = ((newestPrice - oldestPrice) / oldestPrice) * 100;
                trends.push(trend);
              }
            }
          });

          // Calculate average trend
          if (trends.length > 0) {
            marketTrend = trends.reduce((sum, t) => sum + t, 0) / trends.length;
            marketTrend = parseFloat(marketTrend.toFixed(1));
          }
        }
      } catch (err) {
        console.error("Error fetching price trend:", err.response?.data || err.message);
      }

      setStats({
        activeListings,
        messages: unreadCount,
        marketTrend,
        alerts: activeAlerts,
        loading: false,
      });
    };

    fetchStats();
  }, [user, unreadCount, triggeredAlerts?.length]); // Re-fetch when alerts change

  const cards = [
    {
      title: t("quickStats.activeListings"),
      value: user ? (stats.loading ? "..." : stats.activeListings) : "--",
      subtitle: user ? t("quickStats.viewListings") : t("quickStats.signInToView"),
      icon: Package,
      color: "emerald",
      onClick: () => navigate("/my-listings"),
    },
    {
      title: t("quickStats.unreadMessages"),
      value: user ? stats.messages : "--",
      subtitle: user ? (stats.messages > 0 ? t("quickStats.newMessagesWaiting") : t("quickStats.allCaughtUp")) : t("quickStats.signInToChat"),
      icon: MessageCircle,
      color: "blue",
      onClick: () => navigate("/chat"),
    },
    {
      title: t("quickStats.marketTrend"),
      value: stats.loading ? "..." : (stats.marketTrend === 0 ? t("quickStats.stable") : `${stats.marketTrend > 0 ? '+' : ''}${stats.marketTrend}%`),
      trend: stats.marketTrend,
      trendLabel: stats.marketTrend === 0 ? t("quickStats.noChange") : t("quickStats.thisMonth"),
      icon: TrendingUp,
      color: "purple",
      onClick: null,
    },
    {
      title: t("quickStats.priceAlerts"),
      value: user ? (stats.loading ? "..." : stats.alerts) : "--",
      subtitle: user ? t("quickStats.activeAlerts") : t("quickStats.signInForAlerts"),
      icon: Bell,
      color: "amber",
      onClick: user ? null : () => navigate("/signin"),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <StatCard
          key={card.title}
          {...card}
          delay={index * 100}
        />
      ))}
    </div>
  );
};

export default QuickStatsGrid;
