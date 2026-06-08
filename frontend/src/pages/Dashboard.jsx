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
import PriceAlertsPanel from "../components/PriceAlertsPanel";
import MarketOutlookCard from "../components/MarketOutlookCard";
import AttentionStrip from "../components/AttentionStrip";
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
        <div className="relative min-h-screen dash-aurora bg-[#f7f8f9] dark:bg-gray-950">
            {user ? (
                <Navbar user={user} onLogout={handleLogout} unreadCount={unreadCount} />
            ) : (
                <GuestNavbar />
            )}

            {/* Spacer for fixed navbar */}
            <div className="relative z-10 pt-16 sm:pt-20">
                {/* Live Price Ticker - Fixed height and z-index ensures visibility */}
                <div className="relative z-0 h-10 border-b border-primary-100 dark:border-gray-800 bg-primary-50 dark:bg-gray-950">
                    <PriceTicker />
                </div>

                {/* Top bento row: greeting hero (2/3) + promoted Market Outlook (1/3) */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 animate-fadeIn">
                        <div className="lg:col-span-2">
                            <DashboardHero user={user} />
                        </div>
                        <div className="lg:col-span-1">
                            <MarketOutlookCard />
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <section className="mb-8 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                        <QuickStatsGrid user={user} unreadCount={unreadCount} />
                    </section>
                </div>

                {/* Full-width Price Chart - breaks out of container */}
                <section id="price-chart" className="mb-8 px-4 sm:px-6 lg:px-8 animate-fadeIn" style={{ animationDelay: '0.15s' }}>
                    <PriceChart
                        user={user}
                        onLoginRequired={() => navigate("/signin")}
                    />
                </section>

                {/* Bottom bento: attention strip + weather / alerts */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                    <AttentionStrip user={user} unreadCount={unreadCount} />

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Weather Widget */}
                        <div className="animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                            <WeatherWidget />
                        </div>

                        {/* Price Alerts */}
                        <div id="price-alerts" className="animate-fadeIn" style={{ animationDelay: '0.25s' }}>
                            <PriceAlertsPanel user={user} />
                        </div>
                    </section>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Dashboard;
