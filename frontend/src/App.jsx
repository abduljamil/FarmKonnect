import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";
import GlobalNotificationToast from "./components/GlobalNotificationToast";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Marketplace from "./pages/Marketplace";
import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";
import MyListings from "./pages/MyListings";
import AdminPanel from "./pages/AdminPanel";
import ProfileSettings from "./pages/ProfileSettings";
import VerifyEmail from "./pages/VerifyEmail";
import EmailSent from "./pages/EmailSent";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Transactions from "./pages/Transactions";
import TransactionDetails from "./pages/TransactionDetails";
import CreateTransaction from "./pages/CreateTransaction";
import ListingDetails from "./pages/ListingDetails";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import Support from "./pages/Support";

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <NotificationProvider>
          <Router>
            <GlobalNotificationToast />
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

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
