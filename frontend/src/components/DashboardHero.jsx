import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingBag, TrendingUp } from "lucide-react";
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
    <div className="relative h-full overflow-hidden rounded-3xl hero-mesh text-white dash-card">
      {/* Texture overlays */}
      <div className="absolute inset-0 hero-grain opacity-[0.12] mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 hero-dotgrid opacity-50 pointer-events-none" />
      <div className="absolute -top-24 -right-16 w-72 h-72 bg-primary-300/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative h-full px-6 py-7 sm:px-8 sm:py-9 flex flex-col justify-center">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Greeting */}
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/15 text-[12px] font-medium text-emerald-50">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-300" />
              </span>
              {t('landing.hero.badge')}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight leading-[1.1] text-white">
              {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="mt-2 text-emerald-100/80 text-base sm:text-lg max-w-xl">
              {getMessage()}
            </p>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            {user ? (
              <>
                <button
                  onClick={() => navigate("/listings/create")}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white text-primary-800 font-semibold text-sm shadow-lg shadow-black/10 hover:bg-emerald-50 transition"
                >
                  <Plus className="w-4 h-4" />
                  {t('footer.postListing')}
                </button>
                <button
                  onClick={() => navigate("/listings")}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white/10 backdrop-blur text-white font-semibold text-sm ring-1 ring-white/20 hover:bg-white/20 transition"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {t('footer.browseListings')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/signup")}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white text-primary-800 font-semibold text-sm shadow-lg shadow-black/10 hover:bg-emerald-50 transition"
                >
                  <TrendingUp className="w-4 h-4" />
                  {t('landing.cta.getStarted')}
                </button>
                <button
                  onClick={() => navigate("/signin")}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-white/10 backdrop-blur text-white font-semibold text-sm ring-1 ring-white/20 hover:bg-white/20 transition"
                >
                  {t('nav.signIn')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHero;
