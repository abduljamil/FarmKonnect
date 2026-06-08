import React from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Newspaper,
  Clock,
  ArrowRight,
  Bell
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

// Mock news data
const mockNews = [
  {
    id: 1,
    type: "price_alert",
    title: "Cotton prices surge 5% in Lahore",
    description: "Strong demand from textile mills drives prices higher",
    time: "2 hours ago",
    trend: "up",
    commodity: "Cotton",
  },
  {
    id: 2,
    type: "news",
    title: "Punjab Agriculture Department announces subsidy program",
    description: "New fertilizer subsidies available for registered farmers",
    time: "5 hours ago",
    trend: null,
    commodity: null,
  },
  {
    id: 3,
    type: "price_alert",
    title: "Wheat prices stable across Punjab",
    description: "Government procurement maintains market stability",
    time: "1 day ago",
    trend: "stable",
    commodity: "Wheat",
  },
  {
    id: 4,
    type: "news",
    title: "Rice export demand increases from UAE",
    description: "Basmati rice exporters report 20% increase in orders",
    time: "1 day ago",
    trend: "up",
    commodity: "Rice",
  },
  {
    id: 5,
    type: "price_alert",
    title: "Sugar prices dip in Faisalabad",
    description: "Increased supply from local mills affects prices",
    time: "2 days ago",
    trend: "down",
    commodity: "Sugar",
  },
];

const NewsItem = ({ item }) => {
  const getTrendIcon = () => {
    if (item.trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (item.trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
    return null;
  };

  const getTypeIcon = () => {
    if (item.type === "price_alert") return <Bell className="w-4 h-4" />;
    return <Newspaper className="w-4 h-4" />;
  };

  const getTypeColor = () => {
    if (item.type === "price_alert") {
      if (item.trend === "up") return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
      if (item.trend === "down") return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
    }
    return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
  };

  return (
    <div className="group p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${getTypeColor()}`}>
          {getTypeIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
              {item.title}
            </h4>
            {getTrendIcon()}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
            {item.description}
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
              <Clock className="w-3 h-3" />
              {item.time}
            </span>
            {item.commodity && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                {item.commodity}
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
      </div>
    </div>
  );
};

const MarketNewsFeed = ({ maxItems = 5 }) => {
  const { t } = useLanguage();
  const news = mockNews.slice(0, maxItems);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Newspaper className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{t("marketNews.title")}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("marketNews.subtitle")}</p>
          </div>
        </div>
        <button className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">
          {t("marketNews.viewAll")}
        </button>
      </div>

      {/* News List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {news.map((item) => (
          <NewsItem key={item.id} item={item} />
        ))}
      </div>

      {/* Empty State */}
      {news.length === 0 && (
        <div className="px-5 py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t("marketNews.noNews")}</p>
        </div>
      )}
    </div>
  );
};

export default MarketNewsFeed;
