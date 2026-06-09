import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Sparkles, ArrowRight } from "lucide-react";
import API_URL from "../config";
import { useLanguage } from "../contexts/LanguageContext";
import { computeForecastSignal, SIGNAL_TONE } from "../utils/forecastSignal";
import { getCommodityConfig, pickDefaultCity, DISPLAY_COMMODITIES } from "../utils/commodities";
import Ltr from "./Ltr";

// The staple commodity used for the at-a-glance dashboard outlook.
const DEFAULT_COMMODITY = DISPLAY_COMMODITIES[0] || "Wheat";

// Build a tiny sparkline path (anchor price → each horizon forecast).
const buildSpark = (pts, w = 240, h = 40, pad = 4) => {
  if (!pts || pts.length < 2) return null;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const stepX = w / (pts.length - 1);
  const coords = pts.map((v, i) => [
    i * stepX,
    pad + (1 - (v - min) / range) * (h - 2 * pad),
  ]);
  const line = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  return { line, area: `${line} L${w},${h} L0,${h} Z` };
};

// MarketOutlookCard — promotes the price-forecast module to the top of the
// dashboard. Fetches the latest forecast for a default commodity, picks a
// preferred city, and shows the headline Buy/Hold/Sell signal. Degrades
// gracefully: skeleton while loading, soft empty state if no forecast exists.
const MarketOutlookCard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
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

  const spark = sig
    ? buildSpark(
        [sig.baseline, ...sig.ordered.map((d) => d.predicted_price)].filter(
          (v) => v != null && v > 0
        )
      )
    : null;

  const goToTrends = () => navigate("/price-trends");

  return (
    <div className="relative h-full overflow-hidden bg-white dark:bg-gray-800 rounded-3xl dash-card dash-card-hover p-5 flex flex-col">
      {/* Amber accent bar */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
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
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
              <Ltr>₨{Math.round(sig.signalDoc.predicted_price).toLocaleString()}</Ltr>
            </span>
            <span className={`text-sm font-bold tabular-nums ${moveColor}`}>
              <Ltr>{sig.pct > 0 ? "+" : ""}{sig.pct.toFixed(1)}%</Ltr>
            </span>
          </div>

          {/* Sparkline: anchor price → horizon forecasts */}
          {spark && (
            <svg className="w-full h-12 mb-3" viewBox="0 0 240 40" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="moSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={spark.area} fill="url(#moSpark)" />
              <path d={spark.line} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          )}

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
            onClick={goToTrends}
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
