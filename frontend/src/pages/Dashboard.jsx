import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { TrendingUp, Activity, Sparkles, ArrowUpRight } from "lucide-react";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";
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

// Tab shell — Hero sits at top, then a sticky three-tab strip below it
// (Markets / Activity / Insights). Only one section is visible at a time,
// killing the "half-cut cards at the fold" perception that the long-scroll
// layout used to create on landing.
const TABS = [
    { id: "markets", label: "Markets", Icon: TrendingUp },
    { id: "activity", label: "Activity", Icon: Activity },
    { id: "insights", label: "Insights", Icon: Sparkles },
];
const TAB_STORAGE_KEY = "fk_dashboard_tab_v1";

const Dashboard = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [user, setUser] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(() => {
        try {
            const saved = sessionStorage.getItem(TAB_STORAGE_KEY);
            return TABS.some((t) => t.id === saved) ? saved : "markets";
        } catch {
            return "markets";
        }
    });

    // Persist active tab across navigations so users land on the section
    // they were last looking at.
    useEffect(() => {
        try {
            sessionStorage.setItem(TAB_STORAGE_KEY, tab);
        } catch {
            /* sessionStorage unavailable — non-fatal */
        }
    }, [tab]);

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

                {/* Hero — full-width greeting band */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
                    <div className="mb-5 animate-fadeIn">
                        <DashboardHero user={user} />
                    </div>
                </div>

                {/* Sticky tab strip — sits just below the navbar+ticker. The
                    `top` value matches navbar (h-16 sm:h-20) + ticker (h-10),
                    so the tabs lock in place once the hero scrolls off. */}
                <div className="sticky top-[6.5rem] sm:top-[7.5rem] z-20 bg-[#f7f8f9]/85 dark:bg-gray-950/85 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto -mx-1 px-1">
                            {TABS.map(({ id, label, Icon }) => { // eslint-disable-line no-unused-vars
                                const active = tab === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setTab(id)}
                                        className={`relative flex-shrink-0 flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-semibold transition-colors ${
                                            active
                                                ? "text-primary-600 dark:text-primary-400"
                                                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                        {active && (
                                            <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-t bg-gradient-to-r from-primary-500 to-emerald-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Tab content. Each tab is a self-contained section so the
                    visible viewport always ends at a clean component edge —
                    no more half-cut cards at the fold. */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                    {tab === "markets" && (
                        <div className="animate-fadeIn space-y-6" key="markets">
                            <MarketOutlookCard />
                            <div id="price-alerts">
                                <PriceAlertsPanel user={user} />
                            </div>
                            <Link
                                to="/price-trends"
                                className="group flex items-center justify-between gap-3 rounded-2xl p-5 bg-gradient-to-r from-primary-500 to-emerald-500 text-white shadow-md hover:shadow-lg transition-shadow"
                            >
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-emerald-100">Deep dive</p>
                                    <p className="text-base sm:text-lg font-bold">Explore live mandi prices & 12-week forecasts</p>
                                </div>
                                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0" />
                            </Link>
                        </div>
                    )}

                    {tab === "activity" && (
                        <div className="animate-fadeIn space-y-6" key="activity">
                            <QuickStatsGrid user={user} unreadCount={unreadCount} />
                            <AttentionStrip user={user} unreadCount={unreadCount} />
                        </div>
                    )}

                    {tab === "insights" && (
                        <div className="animate-fadeIn space-y-6" key="insights">
                            <WeatherWidget />
                            <Link
                                to="/how-forecasts-work"
                                className="group flex items-center justify-between gap-3 rounded-2xl p-5 bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-primary-300 dark:hover:ring-primary-700 transition-shadow shadow-sm"
                            >
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-primary-600 dark:text-primary-400 font-semibold">Methodology</p>
                                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">How our AI forecasts work</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">LightGBM model · weekly retrain · 12-week horizon</p>
                                </div>
                                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Dashboard;
