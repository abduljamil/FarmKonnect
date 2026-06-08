import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingBag, TrendingUp, Sparkles } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const DashboardHero = ({ user }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Time-based greeting — pulls from translations so the language toggle
  // affects this immediately.
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 17) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  // Motivational message — falls back to a generic welcome string. These
  // keys live in dashboard.welcome on web; on mobile the equivalent is
  // mobile.common.noData (no per-hour message there).
  const getMessage = () => t('dashboard.welcome');

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-700 dark:via-teal-800 dark:to-cyan-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      {/* Decorative circles */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

      {/* Content */}
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Greeting */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span className="text-emerald-100 text-sm font-medium">
                {t('landing.hero.badge')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
              {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
            </h1>
            <p className="text-emerald-100 text-base sm:text-lg max-w-xl">
              {getMessage()}
            </p>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {user ? (
              <>
                <button
                  onClick={() => navigate("/listings/create")}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  {t('footer.postListing')}
                </button>
                <button
                  onClick={() => navigate("/listings")}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white/15 text-white font-semibold rounded-xl hover:bg-white/25 transition-all duration-200 border border-white/20 backdrop-blur-sm"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {t('footer.browseListings')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/signup")}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <TrendingUp className="w-5 h-5" />
                  {t('landing.cta.getStarted')}
                </button>
                <button
                  onClick={() => navigate("/signin")}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white/15 text-white font-semibold rounded-xl hover:bg-white/25 transition-all duration-200 border border-white/20 backdrop-blur-sm"
                >
                  {t('nav.signIn')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div className="text-center sm:text-left">
              <p className="text-2xl sm:text-3xl font-bold text-white">15+</p>
              <p className="text-emerald-200 text-sm">{t('landing.stats.citiesCovered')}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-2xl sm:text-3xl font-bold text-white">6</p>
              <p className="text-emerald-200 text-sm">{t('priceChart.title')}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-2xl sm:text-3xl font-bold text-white">{t('weather.today')}</p>
              <p className="text-emerald-200 text-sm">{t('priceChart.updatedHourly')}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-2xl sm:text-3xl font-bold text-white">{t('landing.cta.createFreeAccount')}</p>
              <p className="text-emerald-200 text-sm">{t('landing.hero.noCommission')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHero;
