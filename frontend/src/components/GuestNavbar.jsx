import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Sun, Moon, Menu, X, Home, TrendingUp, ShoppingBag, Info, Phone } from "lucide-react";

const GuestNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { t, toggleLanguage, isUrdu } = useLanguage();
  const [isPriceChartInView, setIsPriceChartInView] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const closeMobileMenu = () => setMobileMenuOpen(false);

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

  const scrollToPriceChart = (e) => {
    e.preventDefault();
    navigate("/dashboard");
    setTimeout(() => {
      const element = document.getElementById("price-chart");
      if (element) {
        const offset = 100; // Navbar height + extra padding
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group"
          >
            <span className="text-4xl">🌾</span>
            <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              FarmKonnect
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center gap-6">
            <Link
              to="/dashboard"
              className={`font-medium transition-colors ${
                isActive("/dashboard") && !isPriceChartInView
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              }`}
            >
              {t("nav.dashboard")}
            </Link>
            <button
              onClick={scrollToPriceChart}
              className={`font-medium transition-colors ${
                isPriceChartInView
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              }`}
            >
              {t("nav.priceTrends")}
            </button>
            <Link
              to="/listings"
              className={`font-medium transition-colors ${
                isActive("/listings")
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              }`}
            >
              {t("nav.marketplace")}
            </Link>
            <Link
              to="/about"
              className={`font-medium transition-colors ${
                isActive("/about")
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              }`}
            >
              {t("nav.aboutUs")}
            </Link>
            <Link
              to="/contact"
              className={`font-medium transition-colors ${
                isActive("/contact")
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
              }`}
            >
              {t("nav.contactUs")}
            </Link>
          </div>

          {/* Right Section - Desktop */}
          <div className="hidden xl:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Language Toggle */}
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

            {/* Auth Buttons */}
            <Link
              to="/signin"
              className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
            >
              {t("nav.signIn")}
            </Link>
            <button
              onClick={() => navigate("/signup")}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              {t("nav.getStarted")}
            </button>
          </div>

          {/* Mobile Menu Button & Icons */}
          <div className="flex xl:hidden items-center gap-2">
            {/* Theme Toggle - Mobile */}
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
              className="relative z-50 p-2 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-2 flex items-center justify-center shrink-0 w-10 h-10"
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
            {/* Auth Buttons - Mobile */}
            <div className="flex flex-col gap-3 px-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
              <Link
                to="/signin"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                {t("nav.signIn")}
              </Link>
              <Link
                to="/signup"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all font-medium"
              >
                {t("nav.getStarted")}
              </Link>
            </div>

            {/* Navigation Links - Mobile */}
            <div className="space-y-1">
              <Link
                to="/dashboard"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  isActive("/dashboard") && !isPriceChartInView
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">{t("nav.dashboard")}</span>
              </Link>

              <button
                onClick={(e) => {
                  scrollToPriceChart(e);
                  closeMobileMenu();
                }}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 w-full ${isUrdu ? 'text-right' : 'text-left'} ${
                  isPriceChartInView
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">{t("nav.priceTrends")}</span>
              </button>

              <Link
                to="/listings"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  isActive("/listings")
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="font-medium">{t("nav.marketplace")}</span>
              </Link>

              <Link
                to="/about"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  isActive("/about")
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Info className="w-5 h-5" />
                <span className="font-medium">{t("nav.aboutUs")}</span>
              </Link>

              <Link
                to="/contact"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  isActive("/contact")
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Phone className="w-5 h-5" />
                <span className="font-medium">{t("nav.contactUs")}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default GuestNavbar;
