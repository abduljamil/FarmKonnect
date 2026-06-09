import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SocketProvider } from "./contexts/SocketContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ConnectionProvider } from "./contexts/ConnectionContext";
import { HelmetProvider, Helmet } from "react-helmet-async";
import ProtectedRoute from "./components/ProtectedRoute";
import GlobalNotificationToast from "./components/GlobalNotificationToast";
import ConnectionStatus from "./components/ConnectionStatus";
import ScrollToTop from "./components/ScrollToTop";
import Loader from "./components/Loader";
import KisanFloatingWidget from "./components/KisanFloatingWidget";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);

    // Check if it's a chunk load error - these happen after new deployments
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk');

    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('chunk_error_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_error_reload', 'true');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk');

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-8 max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isChunkError ? "App Update Required" : "Something went wrong"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isChunkError
                ? "A new version of the app is available. Please reload to continue."
                : (this.state.error?.message || "An unexpected error occurred")}
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem('chunk_error_reload');
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
            >
              {isChunkError ? "Reload Now" : "Try Again"}
            </button>
            {!isChunkError && (
              <button
                onClick={() => window.location.href = "/"}
                className="mt-4 block w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Go to Home
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load all pages for better performance
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const CreateListing = lazy(() => import("./pages/CreateListing"));
const EditListing = lazy(() => import("./pages/EditListing"));
const MyListings = lazy(() => import("./pages/MyListings"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const EmailSent = lazy(() => import("./pages/EmailSent"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Transactions = lazy(() => import("./pages/Transactions"));
const TransactionDetails = lazy(() => import("./pages/TransactionDetails"));
const CreateTransaction = lazy(() => import("./pages/CreateTransaction"));
const ListingDetails = lazy(() => import("./pages/ListingDetails"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const Support = lazy(() => import("./pages/Support"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Methodology = lazy(() => import("./pages/Methodology"));
const Kisan = lazy(() => import("./pages/Kisan"));
const PriceTrends = lazy(() => import("./pages/PriceTrends"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <Loader size="lg" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <ConnectionProvider>
            <AuthProvider>
              <NotificationProvider>
                <HelmetProvider>
                  <Router>
                    <SocketProvider>
                      <ScrollToTop />
                      <GlobalNotificationToast />
                      <Helmet>
                        <title>FarmKonnect - AI-Powered Agricultural Marketplace</title>
                        <meta name="description" content="FarmKonnect is an AI-powered agricultural marketplace connecting farmers directly with buyers. Trade crops, access market insights, and grow your business." />
                        <meta property="og:image" content="/images/hero-farmer.jpg" />
                        <meta property="twitter:image" content="/images/hero-farmer.jpg" />
                      </Helmet>
                      <ConnectionStatus />
                      <KisanFloatingWidget />
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/" element={<LandingPage />} />
                          {/* Public routes */}
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/listings" element={<Marketplace />} />
                          <Route path="/listings/:id" element={<ListingDetails />} />
                          <Route path="/signin" element={<SignIn />} />
                          <Route path="/signup" element={<SignUp />} />
                          <Route path="/about" element={<AboutUs />} />
                          <Route path="/contact" element={<ContactUs />} />
                          <Route path="/privacy" element={<PrivacyPolicy />} />
                          <Route path="/terms" element={<TermsOfService />} />
                          <Route path="/how-forecasts-work" element={<Methodology />} />
                          <Route path="/price-trends" element={<PriceTrends />} />

                          {/* Email verification and password reset routes */}
                          <Route path="/verify-email/:token" element={<VerifyEmail />} />
                          <Route path="/email-sent" element={<EmailSent />} />
                          <Route path="/forgot-password" element={<ForgotPassword />} />
                          <Route path="/reset-password/:token" element={<ResetPassword />} />

                          {/* Protected routes - require authentication */}
                          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                          <Route path="/listings/create" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
                          <Route path="/listings/edit/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
                          <Route path="/my-listings" element={<ProtectedRoute><MyListings /></ProtectedRoute>} />
                          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                          <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                          <Route path="/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                          <Route path="/transactions/:id" element={<ProtectedRoute><TransactionDetails /></ProtectedRoute>} />
                          <Route path="/buy/:listingId" element={<ProtectedRoute><CreateTransaction /></ProtectedRoute>} />
                          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                          <Route path="/kisan" element={<ProtectedRoute><Kisan /></ProtectedRoute>} />

                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </Suspense>
                    </SocketProvider>
                  </Router>
                </HelmetProvider>
              </NotificationProvider>
            </AuthProvider>
          </ConnectionProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
