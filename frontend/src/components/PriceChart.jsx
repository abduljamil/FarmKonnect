import React, { useEffect, memo, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import API_URL from "../config";
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Leaf,
  RefreshCw,
  BarChart3,
  Activity,
  Layers,
  Calendar,
  Sparkles,
  Info,
  BadgeCheck,
} from "lucide-react";

// Shared commodity catalog (images, colors, family grouping, base lookup)
import { getCommodityConfig, pickDefaultCity, DISPLAY_COMMODITIES } from "../utils/commodities";
import { computeForecastSignal, SIGNAL_TONE } from "../utils/forecastSignal";
import Ltr from "./Ltr";

// Time period options
const TIME_PERIODS = [
  { label: "1W", value: 7 },
  { label: "1M", value: 30 },
  { label: "3M", value: 90 },
  { label: "6M", value: 180 },
  { label: "1Y", value: 365 },
  { label: "5Y", value: 1825 },
  { label: "All", value: 7300 },
];

// Chart type options
const CHART_TYPES = [
  { type: "area", icon: Layers, label: "Area" },
  { type: "line", icon: Activity, label: "Line" },
  { type: "bar", icon: BarChart3, label: "Bar" },
];

// Loading Skeleton
const ChartSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="flex gap-2 overflow-x-auto pb-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-14 w-20 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      ))}
    </div>
    <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
  </div>
);

// Custom Tooltip — distinguishes historical prices from model forecasts.
// A forecast point's payload has `is_forecast`, the predicted value, an
// expected MAPE, and which model produced it (persistence/lgbm_per_commodity/
// lgbm_quantile_median/etc.).
const CustomTooltip = memo(({ active, payload }) => {
  if (active && payload && payload.length) {
    // recharts passes ALL chart series in `payload` ordered by render order.
    // Our forecast chart renders the uncertainty band first (`band_low` +
    // `band_range` Areas, needed for stacking), then `price` (actual), then
    // `predicted_price` (the orange forecast Line). A naive
    // `payload.find(p => p.value != null)` therefore picks `band_low` at any
    // forecast point — i.e. the BOTTOM of the uncertainty band — and the
    // tooltip ends up displaying the band-edge value (e.g. "Rs 3,463")
    // while the visible orange line is at the much higher `predicted_price`
    // (e.g. ~Rs 4,200). It also falls through to the green "actual" styling
    // because the dataKey isn't "predicted_price". Fix: prioritise the
    // meaningful data series — `predicted_price` for forecast points,
    // `price` for historical — over the band auxiliaries.
    const pickByKey = (key) =>
      payload.find((p) => p.dataKey === key && p.value != null);
    const hit =
      pickByKey("predicted_price") ||
      pickByKey("price") ||
      payload.find((p) => p.value != null) ||
      payload[0];
    const d = hit.payload;
    const value = hit.value;
    const isForecast = !!d.is_forecast && hit.dataKey === "predicted_price";
    return (
      <div className={`bg-white dark:bg-gray-800 px-3 py-2 border rounded-xl shadow-lg ${isForecast ? "border-orange-500" : "border-primary-500"}`}>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.fullDate || d.date}</p>
        <p className={`text-lg font-bold ${isForecast ? "text-orange-600 dark:text-orange-400" : "text-primary-600 dark:text-primary-400"}`}>
          ₨{value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
        {isForecast && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            <p>
              Predicted ({d.horizon_weeks} wk forecast)
            </p>
            {d.expected_mape != null && (
              <p>± {d.expected_mape.toFixed(1)}% expected error</p>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = "CustomTooltip";

// Commodity Button Component
const CommodityButton = memo(({ commodity, config, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200
        ${isSelected
          ? `bg-gradient-to-r ${config.gradient} text-white shadow-md`
          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-sm border border-gray-200 dark:border-gray-700"
        }
      `}
    >
      {config.image ? (
        <img src={config.image} alt={commodity} className="w-10 h-10 object-contain" />
      ) : (
        <span className="text-xl">{config.emoji}</span>
      )}
      <span className="text-sm font-semibold">{commodity}</span>
    </button>
  );
});

CommodityButton.displayName = "CommodityButton";

// Dropdown Select Component
const DropdownSelect = memo(({ label, value, options, onChange, disabled, icon: IconComponent }) => { // eslint-disable-line no-unused-vars
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
          rounded-xl text-left transition-all duration-200
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary-500"}
          ${isOpen ? "border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/30" : ""}
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          <IconComponent className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{value || "Select..."}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-2 text-left text-sm font-medium transition-colors
                  ${value === option
                    ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }
                `}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

DropdownSelect.displayName = "DropdownSelect";

// Price Stats Card
const PriceStatsCard = memo(({ label, value, unit, icon: IconComponent, color }) => ( // eslint-disable-line no-unused-vars
  <div className={`p-3 rounded-xl ${color}`}>
    <div className="flex items-center gap-1.5 mb-1">
      <IconComponent className="w-4 h-4" />
      <span className="text-xs font-medium opacity-80">{label}</span>
    </div>
    <p className="text-lg font-bold">₨{value?.toLocaleString() || "—"}</p>
    <p className="text-xs opacity-70">/{unit}</p>
  </div>
));

PriceStatsCard.displayName = "PriceStatsCard";

// Chart Type Button
const ChartTypeButton = memo(({ active, onClick, icon: IconComponent, label }) => ( // eslint-disable-line no-unused-vars
  <button
    onClick={onClick}
    title={label}
    className={`
      p-2 rounded-lg transition-all duration-200
      ${active
        ? "bg-primary-600 text-white shadow-sm"
        : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
      }
    `}
  >
    <IconComponent className="w-4 h-4" />
  </button>
));

ChartTypeButton.displayName = "ChartTypeButton";

// Friendly labels for the model-credibility line.
const MODEL_LABELS = {
  persistence: "Trend baseline",
  lgbm_per_commodity: "LightGBM",
  lgbm_quantile: "LightGBM (quantile)",
  lgbm_quantile_median: "LightGBM (quantile)",
};
const friendlyModel = (m) => MODEL_LABELS[m] || (m ? m.replace(/_/g, " ") : "Model");

// Horizon (weeks) → i18n key suffix for the outlook cards.
const HORIZON_KEY = { 1: "h1", 2: "h2", 4: "h4", 12: "h12" };

// Market Outlook — turns the raw forecast docs (one per horizon, latest anchor)
// into a scannable outlook: a card per horizon (predicted price, %Δ vs the
// model's anchor price, confidence range) plus a plain-language Buy/Hold/Sell
// signal anchored on the 1-month forecast. All numbers wrapped in <Ltr> so they
// stay left-to-right inside Urdu text.
const ForecastOutlook = memo(({ docs, t }) => {
  const sig = computeForecastSignal(docs);
  if (!sig) return null;

  const { ordered, pctOf, signalDoc, trend, mape, confKey } = sig;
  const tone = SIGNAL_TONE[trend];
  const TrendIcon = trend === "rise" ? TrendingUp : trend === "fall" ? TrendingDown : Minus;

  return (
    <div className="mt-4 space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {t("forecast.outlookTitle")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight truncate">
              {t("forecast.outlookSubtitle")}
            </p>
          </div>
        </div>
        <Link
          to="/how-forecasts-work"
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          <Info className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("forecast.linkLabel")}</span>
        </Link>
      </div>

      {/* Per-horizon outlook cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ordered.map((d) => {
          const p = pctOf(d.predicted_price);
          const up = p > 0.5;
          const down = p < -0.5;
          const hasBand = d.predicted_price_low != null && d.predicted_price_high != null;
          const moveColor = up
            ? "text-amber-600 dark:text-amber-400"
            : down
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-gray-500 dark:text-gray-400";
          return (
            <div
              key={d.horizon_weeks}
              className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 ring-1 ring-gray-100 dark:ring-gray-700"
            >
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {t(`forecast.${HORIZON_KEY[d.horizon_weeks] || "h1"}`)}
              </p>
              <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                <Ltr>₨{Math.round(d.predicted_price).toLocaleString()}</Ltr>
              </p>
              <div className={`mt-1 inline-flex items-center gap-0.5 text-xs font-semibold ${moveColor}`}>
                {up ? (
                  <TrendingUp className="w-3 h-3" />
                ) : down ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                <Ltr>{p > 0 ? "+" : ""}{p.toFixed(1)}%</Ltr>
              </div>
              {hasBand && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                  <Ltr>₨{Math.round(d.predicted_price_low).toLocaleString()}–{Math.round(d.predicted_price_high).toLocaleString()}</Ltr>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Buy / Hold / Sell signal */}
      <div className={`p-4 rounded-xl border flex items-start gap-3 ${tone.box}`}>
        <div className={`p-2 rounded-lg flex-shrink-0 ${tone.iconBox}`}>
          <TrendIcon className={`w-5 h-5 ${tone.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-bold text-sm ${tone.title}`}>
              {t(`forecast.signal_${trend}_title`)}
            </p>
            {confKey && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300">
                {t(`forecast.${confKey}`)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">
            {t(`forecast.signal_${trend}_buyer`)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
            {t(`forecast.signal_${trend}_seller`)}
          </p>
        </div>
      </div>

      {/* Credibility / disclaimer line */}
      <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-start gap-1.5">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>
          {t("forecast.modelLine", {
            model: friendlyModel(signalDoc.model),
            error: mape != null ? mape.toFixed(1) : "—",
          })}
          {" — "}
          {t("forecast.disclaimer")}
        </span>
      </p>
    </div>
  );
});

ForecastOutlook.displayName = "ForecastOutlook";

const PriceChart = ({ user, onLoginRequired, commodityOverride, hideCommodityButtons = false }) => {
  const { t } = useLanguage();
  const [commodities, setCommodities] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [cities, setCities] = useState([]);
  const [data, setData] = useState([]);
  const [forecastDocs, setForecastDocs] = useState([]); // raw forecast rows
  const [backtest, setBacktest] = useState(null); // realized accuracy of matured forecasts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("area");

  const [selectedCommodity, setSelectedCommodity] = useState("");
  const [selectedVariety, setSelectedVariety] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [days, setDays] = useState(30);
  const [selectedDate, setSelectedDate] = useState("");
  const [coverage, setCoverage] = useState(null);

  // Only offer time-range options that actually contain data. A period of N
  // days can only show data if the latest point falls within the last N days,
  // so when a series' newest data is months old we hide the shorter ranges.
  const daysSinceLatest = coverage?.maxDate
    ? Math.max(0, Math.floor((Date.now() - new Date(coverage.maxDate).getTime()) / 86400000))
    : 0;
  const availablePeriods =
    coverage && coverage.count > 0
      ? (TIME_PERIODS.filter((p) => p.value >= daysSinceLatest).length
          ? TIME_PERIODS.filter((p) => p.value >= daysSinceLatest)
          : [TIME_PERIODS[TIME_PERIODS.length - 1]])
      : TIME_PERIODS;

  // When embedded in a page (e.g. Price Trends), the commodity is driven from
  // outside via `commodityOverride` — sync it into local state when it changes.
  useEffect(() => {
    if (commodityOverride && commodityOverride !== selectedCommodity) {
      setSelectedCommodity(commodityOverride);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commodityOverride]);

  // Fetch initial data
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const [commoditiesRes, citiesRes] = await Promise.all([
          fetch(`${API_URL}/prices/commodities`),
          fetch(`${API_URL}/prices/cities`),
        ]);

        const commoditiesData = await commoditiesRes.json();
        const citiesData = await citiesRes.json();

        if (!commoditiesRes.ok || !citiesRes.ok) {
          throw new Error("Failed to fetch price data");
        }

        if (isMounted) {
          // Show the curated display commodities that are present, in order.
          const all = commoditiesData.data || [];
          const list = DISPLAY_COMMODITIES.filter((c) => all.includes(c));
          const shown = list.length ? list : all;
          const cityList = citiesData.data || [];

          setCommodities(shown);
          setCities(cityList);
          setSelectedCommodity(commodityOverride || shown[0] || "");
          setSelectedCity(pickDefaultCity(cityList));
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load price data");
          setLoading(false);
        }
      }
    };

    fetchInitialData();
    return () => { isMounted = false; };
    // commodityOverride is read once to seed the default; the dedicated sync
    // effect handles later changes, so we don't want this to re-run on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch varieties when the commodity changes (empty for single-variety commodities)
  useEffect(() => {
    let isMounted = true;

    const fetchVarieties = async () => {
      if (!selectedCommodity) return;
      try {
        const response = await fetch(
          `${API_URL}/prices/varieties/${encodeURIComponent(selectedCommodity)}`
        );
        const responseData = await response.json();
        if (isMounted && response.ok) {
          const list = responseData.data || [];
          setVarieties(list);
          setSelectedVariety((prev) => (list.includes(prev) ? prev : (list[0] || "")));
        }
      } catch {
        if (isMounted) { setVarieties([]); setSelectedVariety(""); }
      }
    };

    fetchVarieties();
    return () => { isMounted = false; };
  }, [selectedCommodity]);

  // Fetch cities for the selected commodity/variety
  useEffect(() => {
    let isMounted = true;

    const fetchCities = async () => {
      if (!selectedCommodity) return;

      try {
        const params = new URLSearchParams({ commodity: selectedCommodity });
        if (selectedVariety) params.set("variety", selectedVariety);

        const response = await fetch(
          `${API_URL}/prices/cities-by-filters?${params.toString()}`
        );
        const responseData = await response.json();

        if (isMounted && response.ok) {
          const list = responseData.data || [];
          setCities(list);
          if (!list.includes(selectedCity)) {
            setSelectedCity(pickDefaultCity(list));
          }
        }
      } catch {
        if (isMounted) {
          setCities([]);
          setSelectedCity("");
        }
      }
    };

    fetchCities();
    return () => { isMounted = false; };
  }, [selectedCommodity, selectedVariety, selectedCity]);

  // Fetch date-range coverage for the selected series; drives the period options.
  useEffect(() => {
    let isMounted = true;

    const fetchCoverage = async () => {
      if (!selectedCommodity || !selectedCity) {
        setCoverage(null);
        return;
      }
      try {
        const params = new URLSearchParams({
          commodity: selectedCommodity,
          city: selectedCity,
        });
        if (selectedVariety) params.set("variety", selectedVariety);
        const response = await fetch(
          `${API_URL}/prices/coverage?${params.toString()}`
        );
        const responseData = await response.json();
        if (isMounted && response.ok) {
          const cov = responseData.data || null;
          setCoverage(cov);
          // Snap to the shortest period that still contains data.
          if (cov && cov.count > 0 && cov.maxDate) {
            const dsl = Math.max(
              0,
              Math.floor((Date.now() - new Date(cov.maxDate).getTime()) / 86400000)
            );
            const valid = TIME_PERIODS.filter((p) => p.value >= dsl);
            const list = valid.length ? valid : [TIME_PERIODS[TIME_PERIODS.length - 1]];
            setDays((d) => (list.some((p) => p.value === d) ? d : list[0].value));
          }
        }
      } catch {
        if (isMounted) setCoverage(null);
      }
    };

    fetchCoverage();
    return () => { isMounted = false; };
  }, [selectedCommodity, selectedVariety, selectedCity]);

  // Fetch price history
  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      if (!selectedCommodity || !selectedCity) return;

      try {
        const params = new URLSearchParams({
          commodity: selectedCommodity,
          city: selectedCity,
        });
        if (selectedVariety) params.set("variety", selectedVariety);

        if (selectedDate) {
          params.set("date", selectedDate);
        } else {
          params.set("days", days.toString());
        }

        const response = await fetch(
          `${API_URL}/prices/history?${params.toString()}`
        );
        const responseData = await response.json();

        if (!response.ok) throw new Error(responseData.message);

        if (isMounted) {
          // Multi-year ranges show month+year on the axis; the tooltip always
          // carries the full date.
          const longRange = !selectedDate && days > 365;
          const mapped = (responseData.data || []).map((item) => {
            const d = new Date(item.date);
            return {
              date: longRange
                ? d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              fullDate: d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
              price: item.price,
              unit: item.unit,
            };
          });

          setData(mapped);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setData([]);
          setError(err.message || "Failed to load price data");
        }
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
  }, [selectedCommodity, selectedVariety, selectedCity, days, selectedDate]);

  // Fetch model forecasts for the same (commodity, variety, city). The router
  // emits one prediction per horizon (1, 2, 4, 12 wk) anchored to the most
  // recent W-FRI week. We keep only the *latest* anchor's set so the chart
  // shows one forward-looking forecast curve, not a tangle of historical
  // ones. (Older anchors are still in the DB for monitoring / debug.)
  useEffect(() => {
    let isMounted = true;

    const fetchForecast = async () => {
      if (!selectedCommodity || !selectedCity) {
        setForecastDocs([]);
        return;
      }
      try {
        const params = new URLSearchParams({
          commodity: selectedCommodity,
          city: selectedCity,
        });
        if (selectedVariety) params.set("variety", selectedVariety);

        const response = await fetch(
          `${API_URL}/prices/forecast?${params.toString()}`
        );
        const responseData = await response.json();
        if (!response.ok || !isMounted) return;

        const docs = responseData.data || [];
        if (docs.length === 0) {
          setForecastDocs([]);
          return;
        }
        const latestAnchor = docs.reduce(
          (m, d) => (new Date(d.anchor_date) > new Date(m) ? d.anchor_date : m),
          docs[0].anchor_date
        );
        const latestSet = docs.filter((d) => d.anchor_date === latestAnchor);
        setForecastDocs(latestSet);
      } catch {
        if (isMounted) setForecastDocs([]);
      }
    };

    fetchForecast();
    return () => { isMounted = false; };
  }, [selectedCommodity, selectedVariety, selectedCity]);

  // Backtest / track-record: compare *matured* forecasts (forecast_date already
  // in the past) against the price that actually materialised. We pull every
  // forecast anchor plus a wide history window, match each matured prediction
  // to the nearest actual (weekly cadence → ±6-day tolerance), and report the
  // realised mean error. Hidden unless we can match a meaningful sample.
  useEffect(() => {
    let isMounted = true;

    const fetchBacktest = async () => {
      if (!selectedCommodity || !selectedCity) {
        setBacktest(null);
        return;
      }
      try {
        const fParams = new URLSearchParams({ commodity: selectedCommodity, city: selectedCity });
        const hParams = new URLSearchParams({ commodity: selectedCommodity, city: selectedCity, days: "900" });
        if (selectedVariety) {
          fParams.set("variety", selectedVariety);
          hParams.set("variety", selectedVariety);
        }

        const [fRes, hRes] = await Promise.all([
          fetch(`${API_URL}/prices/forecast?${fParams.toString()}`),
          fetch(`${API_URL}/prices/history?${hParams.toString()}`),
        ]);
        const fJson = await fRes.json();
        const hJson = await hRes.json();
        if (!isMounted || !fRes.ok || !hRes.ok) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const matured = (fJson.data || []).filter((d) => new Date(d.forecast_date) < today);
        const actuals = (hJson.data || [])
          .filter((p) => p.price != null)
          .map((p) => ({ t: new Date(p.date).getTime(), price: p.price }));

        if (matured.length === 0 || actuals.length === 0) {
          setBacktest(null);
          return;
        }

        const TOL = 6 * 86400000; // ±6 days
        const errs = [];
        let latest = null;
        for (const d of matured) {
          const ft = new Date(d.forecast_date).getTime();
          let best = null;
          let bestGap = Infinity;
          for (const a of actuals) {
            const gap = Math.abs(a.t - ft);
            if (gap < bestGap) {
              bestGap = gap;
              best = a;
            }
          }
          if (!best || bestGap > TOL || !best.price) continue;
          const errPct = (Math.abs(d.predicted_price - best.price) / best.price) * 100;
          errs.push(errPct);
          if (!latest || ft > latest.ft) {
            latest = { ft, pred: d.predicted_price, actual: best.price, errPct };
          }
        }

        // Need a few matched points before claiming a track record.
        if (errs.length < 3) {
          setBacktest(null);
          return;
        }
        const mape = errs.reduce((a, b) => a + b, 0) / errs.length;
        setBacktest({ count: errs.length, mape, latest });
      } catch {
        if (isMounted) setBacktest(null);
      }
    };

    fetchBacktest();
    return () => { isMounted = false; };
  }, [selectedCommodity, selectedVariety, selectedCity]);

  const handleProtectedAction = useCallback((action) => {
    if (!user && onLoginRequired) {
      onLoginRequired();
      return;
    }
    action();
  }, [user, onLoginRequired]);

  // Calculate statistics
  const prices = data.map(d => d.price).filter(Boolean);
  const latestPrice = prices[prices.length - 1] || 0;
  const firstPrice = prices[0] || 0;
  const highPrice = prices.length ? Math.max(...prices) : 0;
  const lowPrice = prices.length ? Math.min(...prices) : 0;
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const priceChange = firstPrice ? ((latestPrice - firstPrice) / firstPrice * 100) : 0;
  const isPositive = priceChange > 0;
  const isNegative = priceChange < 0;

  // Forecast forward into the future — append the latest-anchor forecast rows
  // after the historical data so recharts draws a continuous left-to-right axis.
  // History rows have `price` only; forecast rows have `predicted_price` only.
  // That way the two series render as visually distinct, non-overlapping lines.
  const chartData = useMemo(() => {
    if (forecastDocs.length === 0) return data;
    const longRange = !selectedDate && days > 365;
    const forecastRows = [...forecastDocs]
      .sort((a, b) => new Date(a.forecast_date) - new Date(b.forecast_date))
      .map((d) => {
        const fd = new Date(d.forecast_date);
        // Phase 10.5: prefer real q10/q90 band when the prediction doc carries
        // it (currently only Sugar h=12 cells). Fall back to expected_mape%
        // around the point forecast otherwise.
        const hasRealBand =
          d.predicted_price_low != null && d.predicted_price_high != null;
        const band_low = hasRealBand
          ? d.predicted_price_low
          : (d.expected_mape != null
              ? d.predicted_price * (1 - d.expected_mape / 100)
              : null);
        const band_high = hasRealBand
          ? d.predicted_price_high
          : (d.expected_mape != null
              ? d.predicted_price * (1 + d.expected_mape / 100)
              : null);
        return {
          date: longRange
            ? fd.toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : fd.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          fullDate: fd.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
          price: null,
          predicted_price: d.predicted_price,
          band_low,
          band_high,
          // For Area stacking trick — height of the band above the lower bound.
          band_range: band_low != null && band_high != null ? band_high - band_low : null,
          band_is_real: hasRealBand,
          is_forecast: true,
          horizon_weeks: d.horizon_weeks,
          model: d.model,
          expected_mape: d.expected_mape,
          unit: d.unit,
        };
      });
    // Bridge: pin `predicted_price` on the LAST HISTORICAL ROW so the orange
    // dashed forecast line picks up continuously from wherever the green
    // actual line ends.
    //
    // Bug we're fixing: this used to bridge with `forecastDocs[0].anchor_price`,
    // i.e. the price at the model's anchor week. The model's anchor is usually
    // a week or two stale relative to the latest scraped price the user sees
    // on the chart. When anchor_price < latest_actual_price (very common after
    // a price uptick), the forecast line started BELOW the actual line and
    // climbed toward the predicted values — so the line VISUALLY went up
    // while every tooltip value was LESS than the current actual price. Users
    // read this as "the forecast is going up" while the numbers said the
    // opposite.
    //
    // The model's predicted_price for each horizon is untouched (tooltips
    // still show the exact model output). Only the bridge connector uses
    // the latest actual, so the curve makes visual sense end-to-end. Fall
    // back to anchor_price when the history series is somehow empty.
    const lastActualPrice =
      data.length > 0 ? data[data.length - 1].price : null;
    const bridgeValue = lastActualPrice ?? forecastDocs[0].anchor_price;
    const bridgedHistory = data.map((d, i) =>
      i === data.length - 1 ? { ...d, predicted_price: bridgeValue } : d
    );
    return [...bridgedHistory, ...forecastRows];
  }, [data, forecastDocs, selectedDate, days]);

  // Fall back to base family config when a variant has no dedicated entry.
  const currentConfig = getCommodityConfig(selectedCommodity);

  const displayUnit = data.length > 0 && data[data.length - 1]?.unit
    ? data[data.length - 1].unit.replace('Rs/', '').replace('(Maund)', 'Maund')
    : (selectedCommodity === 'Sugar' || selectedCommodity === 'Flour' ? 'Kg' : '40Kg Maund');

  const isEmpty = !loading && data.length === 0;

  // Render chart based on type. History uses `dataKey="price"` (green/area);
  // forecast uses `dataKey="predicted_price"` (orange/dashed) and renders only
  // when forecastDocs is populated.
  const renderChart = () => {
    const isMobile = window.innerWidth < 640;
    const hasForecast = forecastDocs.length > 0;
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: isMobile ? 10 : 30, left: 5, bottom: 5 }
    };

    const xAxisProps = {
      dataKey: "date",
      tick: { fontSize: isMobile ? 10 : 13, fill: "#6b7280", fontWeight: 500 },
      interval: chartData.length > (isMobile ? 8 : 14) ? Math.floor(chartData.length / (isMobile ? 4 : 5)) : 0,
      axisLine: false,
      tickLine: false,
      tickMargin: 8,
    };

    const yAxisProps = {
      tick: { fontSize: isMobile ? 10 : 13, fill: "#6b7280", fontWeight: 500 },
      tickFormatter: (value) => `₨${value.toLocaleString()}`,
      domain: ["auto", "auto"],
      axisLine: false,
      tickLine: false,
      width: isMobile ? 50 : 80,
    };

    // Orange dashed line for forecast — connectNulls=true so the forecast line
    // jumps from the bridged-history anchor to the future forecast points.
    const forecastLine = (
      <Line
        type="monotone"
        dataKey="predicted_price"
        stroke="#f97316"
        strokeWidth={isMobile ? 2 : 2.5}
        strokeDasharray="6 4"
        dot={{ r: 3.5, fill: "#f97316", stroke: "#fff", strokeWidth: 1.5 }}
        activeDot={{ r: 5, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
        connectNulls
        isAnimationActive={false}
      />
    );

    // Phase 10.5: uncertainty band rendered via the recharts stacked-Area trick.
    // - First Area: dataKey="band_low", invisible base lifting the next layer up
    // - Second Area: dataKey="band_range" = band_high - band_low, filled orange
    // Stacking the two yields a coloured strip from band_low to band_high.
    // Only emit when at least one forecast row carries a real band; otherwise
    // recharts can't compute the stack and just collapses cleanly.
    const hasBand = hasForecast && chartData.some(
      (r) => r.band_low != null && r.band_range != null
    );
    const bandAreas = hasBand ? (
      <>
        <Area
          type="monotone"
          dataKey="band_low"
          stackId="forecast_band"
          stroke="none"
          fill="transparent"
          isAnimationActive={false}
          legendType="none"
          activeDot={false}
        />
        <Area
          type="monotone"
          dataKey="band_range"
          stackId="forecast_band"
          stroke="none"
          fill="#f97316"
          fillOpacity={0.15}
          isAnimationActive={false}
          legendType="none"
          activeDot={false}
        />
      </>
    ) : null;

    switch (chartType) {
      case "line":
        return (
          <LineChart {...commonProps}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {bandAreas}
            <Line
              type="monotone"
              dataKey="price"
              stroke="url(#lineGradient)"
              strokeWidth={isMobile ? 2 : 2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#059669", stroke: "#fff", strokeWidth: 2 }}
              connectNulls={false}
            />
            {hasForecast && forecastLine}
          </LineChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="forecastBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="price" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
            {hasForecast && (
              <Bar dataKey="predicted_price" fill="url(#forecastBarGradient)" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        );

      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="areaStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {bandAreas}
            <Area
              type="monotone"
              dataKey="price"
              stroke="url(#areaStroke)"
              strokeWidth={isMobile ? 2 : 2.5}
              fill="url(#areaGradient)"
              connectNulls={false}
            />
            {hasForecast && forecastLine}
          </AreaChart>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl dash-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-emerald-50 dark:from-primary-900/20 dark:to-emerald-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("priceChart.title")}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("priceChart.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Chart Type Toggle */}
            <div className="flex items-center gap-0.5 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {CHART_TYPES.map(({ type, icon, label }) => (
                <ChartTypeButton
                  key={type}
                  active={chartType === type}
                  onClick={() => setChartType(type)}
                  icon={icon}
                  label={label}
                />
              ))}
            </div>
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4">
          <ChartSkeleton />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Commodity Selection */}
          {!hideCommodityButtons && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {commodities.map((commodity) => (
                <CommodityButton
                  key={commodity}
                  commodity={commodity}
                  config={getCommodityConfig(commodity)}
                  isSelected={selectedCommodity === commodity}
                  onClick={() => setSelectedCommodity(commodity)}
                />
              ))}
            </div>
          )}

          {/* Filters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Variety Dropdown */}
            {varieties.length > 0 && (
              <DropdownSelect
                label={t("priceChart.variety")}
                icon={Leaf}
                value={selectedVariety}
                options={varieties}
                onChange={(v) => handleProtectedAction(() => setSelectedVariety(v))}
              />
            )}

            {/* City Dropdown */}
            <DropdownSelect
              label={t("priceChart.city")}
              icon={MapPin}
              value={selectedCity}
              options={cities}
              onChange={(c) => handleProtectedAction(() => setSelectedCity(c))}
            />

          </div>

          {/* Date and Period Selection */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            {/* Date Picker */}
            <div className="w-full sm:w-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1.5 ml-1">{t("priceChart.date")}</p>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  min={coverage?.minDate ? new Date(coverage.minDate).toISOString().split('T')[0] : undefined}
                  max={coverage?.maxDate ? new Date(coverage.maxDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleProtectedAction(() => {
                    setSelectedDate(e.target.value);
                    setDays(30); // Reset or keep default, visually it will depend on selectedDate being truthy
                  })}
                  className={`
                    w-full h-[42px] px-3 py-2 pl-10 rounded-lg
                    bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200
                    border-0
                    focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400
                    outline-none transition-all duration-200
                    [color-scheme:light] dark:[color-scheme:dark]
                    [&::-webkit-calendar-picker-indicator]:dark:invert
                    [&::-webkit-calendar-picker-indicator]:opacity-60
                    [&::-webkit-calendar-picker-indicator]:hover:opacity-100
                    [&::-webkit-calendar-picker-indicator]:cursor-pointer
                    ${selectedDate ? "ring-2 ring-primary-500 dark:ring-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/30" : ""}
                  `}
                />
                <Calendar className={`
                  absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none
                  ${selectedDate ? "text-primary-600 dark:text-primary-400" : "text-gray-400 dark:text-gray-500"}
                `} />
              </div>
            </div>

            {/* Time Period */}
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1.5 ml-1">{t("priceChart.period")}</p>
              <div className="flex gap-0.5 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl h-[42px]">
                {availablePeriods.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => handleProtectedAction(() => {
                      setDays(period.value);
                      setSelectedDate(""); // Clear date when period is selected
                    })}
                    className={`
                      flex-1 rounded-lg text-sm font-semibold transition-all duration-200
                      ${(days === period.value && !selectedDate)
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      }
                    `}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price Display */}
          <div className="px-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${currentConfig.bg}`}>
                  {currentConfig.image ? (
                    <img src={currentConfig.image} alt={selectedCommodity} className="w-12 h-12 object-contain" />
                  ) : (
                    <span className="text-2xl">{currentConfig.emoji}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedCommodity}{selectedVariety && ` • ${selectedVariety}`} • {selectedCity}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight tabular-nums text-gray-900 dark:text-white">
                      <Ltr>₨{latestPrice.toLocaleString()}</Ltr>
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/{displayUnit}</span>
                  </div>
                </div>
              </div>

              {latestPrice > 0 && (
                <div className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl
                  ${isPositive ? "bg-green-100 dark:bg-green-900/50" : isNegative ? "bg-red-100 dark:bg-red-900/50" : "bg-gray-100 dark:bg-gray-700"}
                `}>
                  {isPositive ? (
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : isNegative ? (
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-500" />
                  )}
                  <div>
                    <p className={`text-lg font-bold tabular-nums ${isPositive ? "text-green-700 dark:text-green-400" : isNegative ? "text-red-700 dark:text-red-400" : "text-gray-600"
                      }`}>
                      <Ltr>{isPositive ? "+" : ""}{priceChange.toFixed(1)}%</Ltr>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2">
            <PriceStatsCard
              label={t("priceChart.high")}
              value={highPrice}
              unit={displayUnit}
              icon={TrendingUp}
              color="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            />
            <PriceStatsCard
              label={t("priceChart.avg")}
              value={avgPrice}
              unit={displayUnit}
              icon={Minus}
              color="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            />
            <PriceStatsCard
              label={t("priceChart.low")}
              value={lowPrice}
              unit={displayUnit}
              icon={TrendingDown}
              color="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            />
          </div>

          {/* Chart */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
            <div className="w-full h-64">
              {error || isEmpty ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-sm font-medium mb-1">{t("priceChart.noData")}</p>
                  <p className="text-xs text-center max-w-xs mb-3">
                    {error || t("priceChart.noDataDesc")}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-900/60 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t("priceChart.refresh")}
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              )}
            </div>
            {/* Forecast legend */}
            {forecastDocs.length > 0 && !isEmpty && !error && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-0.5 bg-primary-600 rounded" />
                  {t("forecast.legendActual")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-orange-500" />
                  {t("forecast.legendForecast")}
                </span>
                {forecastDocs.some(
                  (d) => d.predicted_price_low != null && d.predicted_price_high != null
                ) && (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-3 bg-orange-500/20 rounded-sm" />
                    {t("forecast.legendRange")}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Market Outlook — forecast cards + Buy/Hold/Sell signal */}
          {forecastDocs.length > 0 && !isEmpty && !error && (
            <ForecastOutlook docs={forecastDocs} t={t} />
          )}

          {/* Track record — realised accuracy of matured forecasts */}
          {backtest && !isEmpty && !error && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
              <div className="flex items-center gap-1.5 mb-1">
                <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                  {t("forecast.accuracyTitle")}
                </h4>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {t("forecast.accuracyLine", { count: backtest.count, mape: backtest.mape.toFixed(1) })}
              </p>
              {backtest.latest && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("forecast.accuracyLatest", {
                    pred: `₨${Math.round(backtest.latest.pred).toLocaleString()}`,
                    actual: `₨${Math.round(backtest.latest.actual).toLocaleString()}`,
                    err: backtest.latest.errPct.toFixed(1),
                  })}
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <p>{t("priceChart.source")}</p>
            <p>{t("priceChart.updatedHourly")}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(PriceChart);
