import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, ArrowRight } from "lucide-react";
import API_URL from "../config";
import { useLanguage } from "../contexts/LanguageContext";
import { computeForecastSignal, SIGNAL_TONE } from "../utils/forecastSignal";
import { getCommodityConfig, pickDefaultCity, DISPLAY_COMMODITIES } from "../utils/commodities";
import Ltr from "./Ltr";

// The staple commodity used for the at-a-glance dashboard outlook.
const DEFAULT_COMMODITY = DISPLAY_COMMODITIES[0] || "Wheat";

// MarketOutlookCard — promotes the price-forecast module to the top of the
// dashboard. Fetches the latest forecast for a default commodity, picks a
// preferred city, and shows the headline Buy/Hold/Sell signal. Degrades
// gracefully: skeleton while loading, soft empty state if no forecast exists.
const MarketOutlookCard = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // { sig, city }

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const res = await fetch(
          `${API_URL}/prices/forecast?commodity=${encodeURIComponent(DEFAULT_COMMODITY)}`
        );
        const json = await res.json();
        if (!mounted) return;

        const docs = (res.ok && json.data) || [];
        if (docs.length === 0) {
          setData(null);
          setLoading(false);
          return;
        }

        // Keep only the most recent anchor's predictions.
        const latestAnchor = docs.reduce(
          (m, d) => (new Date(d.anchor_date) > new Date(m) ? d.anchor_date : m),
          docs[0].anchor_date
        );
        let set = docs.filter((d) => d.anchor_date === latestAnchor);

        // Pick a preferred city among those present.
        const cities = [...new Set(set.map((d) => d.city).filter(Boolean))];
        const city = pickDefaultCity(cities) || cities[0] || "";
        if (city) set = set.filter((d) => d.city === city);

        const sig = computeForecastSignal(set);
        setData(sig ? { sig, city } : null);
        setLoading(false);
      } catch {
        if (mounted) {
          setData(null);
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  const config = getCommodityConfig(DEFAULT_COMMODITY);
  const sig = data?.sig;
  const tone = sig ? SIGNAL_TONE[sig.trend] : null;
  const TrendIcon = sig
    ? sig.trend === "rise"
      ? TrendingUp
      : sig.trend === "fall"
      ? TrendingDown
      : Minus
    : null;
  const moveColor = sig
    ? sig.pct > 0.5
      ? "text-amber-600 dark:text-amber-400"
      : sig.pct < -0.5
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-gray-500 dark:text-gray-400"
    : "";

  const scrollToChart = () =>
    document.getElementById("price-chart")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
          <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          {t("forecast.outlookTitle")}
        </h3>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3 flex-1">
          <div className="h-5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-9 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-20 bg-gray-100 dark:bg-gray-700/60 rounded-xl" />
        </div>
      ) : !sig ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 py-6">
          <Sparkles className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">{t("forecast.noOutlook")}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Commodity + city */}
          <div className="flex items-center gap-2.5 mb-4">
            {config.image ? (
              <img src={config.image} alt={DEFAULT_COMMODITY} className="w-9 h-9 object-contain" />
            ) : (
              <span className="text-2xl">{config.emoji}</span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {DEFAULT_COMMODITY}
              </p>
              {data.city && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{data.city}</p>
              )}
            </div>
          </div>

          {/* 1-month predicted price + move */}
          <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {t("forecast.h4")} · {t("forecast.vsToday")}
          </p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
              <Ltr>₨{Math.round(sig.signalDoc.predicted_price).toLocaleString()}</Ltr>
            </span>
            <span className={`text-sm font-bold tabular-nums ${moveColor}`}>
              <Ltr>{sig.pct > 0 ? "+" : ""}{sig.pct.toFixed(1)}%</Ltr>
            </span>
          </div>

          {/* Signal */}
          <div className={`p-3 rounded-xl border flex items-start gap-2 ${tone.box}`}>
            <div className={`p-1.5 rounded-lg flex-shrink-0 ${tone.iconBox}`}>
              <TrendIcon className={`w-4 h-4 ${tone.icon}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold ${tone.title}`}>
                {t(`forecast.signal_${sig.trend}_title`)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                {t(`forecast.signal_${sig.trend}_seller`)}
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={scrollToChart}
            className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:gap-2 transition-all"
          >
            {t("forecast.viewFull")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MarketOutlookCard;
