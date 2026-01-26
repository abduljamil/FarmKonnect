import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";
import PriceChart from "../components/PriceChart";
import PriceTicker from "../components/PriceTicker";
import Loader from "../components/Loader";
import DashboardHero from "../components/DashboardHero";
import QuickStatsGrid from "../components/QuickStatsGrid";
import WeatherWidget from "../components/WeatherWidget";
import MarketNewsFeed from "../components/MarketNewsFeed";
import PriceAlertsPanel from "../components/PriceAlertsPanel";
import chatAPI from "../utils/chatApi";
import { authAPI } from "../utils/api";
import socketService from "../utils/socket";
import useUserSync from "../hooks/useUserSync";

const Dashboard = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [user, setUser] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Auto-sync user data (role updates)
    useUserSync(user, setUser, navigate);

    // Handle initial load and OAuth success redirect
    useEffect(() => {
        const initializeDashboard = async () => {
            const authSuccess = searchParams.get("auth");

            // Handle OAuth success - fetch user from cookie session
            if (authSuccess === "success") {
                try {
                    const response = await authAPI.getMe();
                    if (response.user) {
                        sessionStorage.setItem("user", JSON.stringify(response.user));
                        setUser(response.user);
                        // Remove the query param from URL
                        searchParams.delete("auth");
                        setSearchParams(searchParams, { replace: true });

                        // Connect socket for authenticated user
                        if (response.user.token) {
                            socketService.connect(response.user.token);
                        }
                        // Listen for unread count updates (don't use onNewMessage - it conflicts with Chat.jsx)
                        socketService.onUnreadCountUpdated(() => {
                            loadUnreadCount();
                        });
                        // Listen directly on socket for new messages to update unread count
                        if (socketService.socket) {
                            socketService.socket.on("new_message", () => loadUnreadCount());
                        }

                        loadUnreadCount();
                    }
                } catch (err) {
                    console.error("Failed to fetch user after OAuth:", err);
                } finally {
                    setLoading(false);
                }
                return;
            }

            // Normal load - check sessionStorage
            const userData = sessionStorage.getItem("user");

            if (!userData) {
                // Allow public access to view prices
                setLoading(false);
                return;
            }

            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            loadUnreadCount();

            // Connect socket with authentication token
            if (parsedUser.token) {
                socketService.connect(parsedUser.token);
            }
            // Listen for unread count updates (don't use onNewMessage - it conflicts with Chat.jsx)
            socketService.onUnreadCountUpdated(() => {
                loadUnreadCount();
            });
            // Listen directly on socket for new messages to update unread count
            if (socketService.socket) {
                socketService.socket.on("new_message", () => loadUnreadCount());
            }

            setLoading(false);
        };

        initializeDashboard();
    }, [navigate, searchParams, setSearchParams]);

    const loadUnreadCount = async () => {
        // Only load if user is authenticated
        const userData = sessionStorage.getItem("user");
        if (!userData) return;

        try {
            const response = await chatAPI.getUnreadCount();
            setUnreadCount(response.data?.count || 0);
        } catch (error) {
            // Silently fail for auth errors - user might not be fully authenticated yet
            if (!error.message?.includes('Not authorized')) {
                console.error("Error loading unread count:", error);
            }
        }
    };

    const handleLogout = async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error("Logout error:", error);
        }
        sessionStorage.removeItem("user");
        socketService.disconnect();
        navigate("/signin");
    };

    if (loading) {
        return <Loader fullScreen size="lg" />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-emerald-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
            {user ? (
                <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
            ) : (
                <GuestNavbar />
            )}

            {/* Spacer for fixed navbar */}
            <div className="pt-16 sm:pt-20">
                {/* Live Price Ticker */}
                <PriceTicker />

            {/* Hero and Stats in max-w-7xl container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Hero Section */}
                <section className="mb-8 animate-fadeIn">
                    <DashboardHero user={user} />
                </section>

                {/* Quick Stats Grid */}
                <section className="mb-8">
                    <QuickStatsGrid user={user} unreadCount={unreadCount} />
                </section>
            </div>

            {/* Full-width Price Chart - breaks out of container */}
            <section id="price-chart" className="mb-8 px-4 sm:px-6 lg:px-8 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                <PriceChart
                    user={user}
                    onLoginRequired={() => navigate("/signin")}
                />
            </section>

            {/* Widgets Grid in max-w-7xl container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Weather Widget */}
                    <div className="animate-fadeIn" style={{ animationDelay: '0.15s' }}>
                        <WeatherWidget />
                    </div>

                    {/* Price Alerts */}
                    <div className="animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                        <PriceAlertsPanel user={user} />
                    </div>

                    {/* Market News */}
                    <div className="animate-fadeIn" style={{ animationDelay: '0.25s' }}>
                        <MarketNewsFeed maxItems={4} />
                    </div>
                </section>
            </div>
            </div>

            <Footer />
        </div>
    );
};

export default Dashboard;
