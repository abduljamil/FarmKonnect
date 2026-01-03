import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import StatsCard from "../components/StatsCard";
import PriceChart from "../components/PriceChart";
import Loader from "../components/Loader";
import chatAPI from "../utils/chatApi";
import socketService from "../utils/socket";
import useUserSync from "../hooks/useUserSync";
import { TrendingUp, AlertCircle, FileText } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Auto-sync user data (role updates)
  useUserSync(user, setUser, navigate);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");

    if (!token) {
      navigate("/signin");
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
      loadUnreadCount();

      // Connect socket and listen for messages
      socketService.connect(token);
      socketService.onNewMessage(async () => {
        // Reload unread count when message arrives
        loadUnreadCount();
      });

      // Listen for unread count updates (when messages are marked as read)
      socketService.onUnreadCountUpdated(() => {
        loadUnreadCount();
      });
    }
    setLoading(false);
  }, [navigate]);

  const loadUnreadCount = async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const handlePostNew = () => {
    navigate("/create-listing");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/signin");
  };

  if (!user || loading) {
    return <Loader fullScreen size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to FarmKonnect 🌱
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            AI-Powered Agricultural Marketplace connecting farmers and buyers directly
          </p>
        </div>

       
  

        {/* Main Content Row - Chart Section */}
        <div className="mb-6 sm:mb-8">
          {/* Price Chart - Takes full width with commodity/variety/city selectors */}
          <PriceChart />
        </div>

        {/* Market Insights Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Market Insights Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Market Insights
            </h3>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <span>Wheat prices trending upward in the last 7 days</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <span>Best time to post new listings is mornings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <span>Bulk orders get 5-10% premium prices</span>
              </li>
            </ul>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-800 rounded-lg shadow-md p-4 sm:p-6 border border-emerald-200 dark:border-emerald-700">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate("/marketplace")}
                className="w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-700 rounded transition-colors"
              >
                🌾 Browse Marketplace
              </button>
              <button
                onClick={() => navigate("/chat")}
                className="w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-700 rounded transition-colors"
              >
                💬 Messages {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                onClick={() => navigate("/my-listings")}
                className="w-full text-left px-3 sm:px-4 py-2 text-sm sm:text-base text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-700 rounded transition-colors"
              >
                📋 My Listings
              </button>
            </div>
          </div>

          {/* Top Commodities Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700 sm:col-span-2 lg:col-span-1">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Top Commodities
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">🌾 Wheat</span>
                <span className="text-green-600 font-medium text-sm sm:text-base">↑ 2.3%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">🍚 Rice</span>
                <span className="text-red-600 font-medium text-sm sm:text-base">↓ 1.1%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">🌽 Maize</span>
                <span className="text-green-600 font-medium">↑ 0.8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info Card */}
        <Card
          variant="default"
          padding="lg"
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">👤</span>
            Account Information
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Name
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {user.name}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Email
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {user.email}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Role
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 capitalize">
                {user.role}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                User ID
              </span>
              <span className="text-gray-900 dark:text-white font-mono text-sm">
                {user.id}
              </span>
            </div>
          </div>
        </Card>

        {/* Feature Cards */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Explore Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              variant="default"
              hover
              onClick={() => navigate("/marketplace")}
              className="group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                🛒
              </div>
              <h4 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Browse Marketplace
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Explore fresh agricultural listings from local farmers
              </p>
            </Card>

            <Card variant="default" className="opacity-60">
              <div className="text-4xl mb-4">🤖</div>
              <h4 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                AI Assistant
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Get smart recommendations powered by AI
              </p>
              <span className="inline-block mt-3 text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                Coming Soon
              </span>
            </Card>

            <Card variant="default" className="opacity-60">
              <div className="text-4xl mb-4">📊</div>
              <h4 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Analytics
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Track your orders and market trends
              </p>
              <span className="inline-block mt-3 text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                Coming Soon
              </span>
            </Card>

            <Card
              variant="default"
              hover
              onClick={() => navigate("/chat")}
              className="group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                💬
              </div>
              <h4 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                Connect
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Message directly with farmers and buyers
              </p>
              {unreadCount > 0 && (
                <span className="inline-block mt-3 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
