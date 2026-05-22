import React, { useEffect, memo, useState, useCallback } from "react";
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
} from "lucide-react";

// Shared commodity catalog (images, colors, family grouping, base lookup)
import { getCommodityConfig, buildFamilies, pickDefaultCity } from "../utils/commodities";

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

// Custom Tooltip
const CustomTooltip = memo(({ active, payload }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const value = payload[0].value;
    return (
      <div className="bg-white dark:bg-gray-800 px-3 py-2 border border-primary-500 rounded-xl shadow-lg">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{dataPoint.fullDate || dataPoint.date}</p>
        <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
          ₨{value?.toLocaleString()}
        </p>
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

const PriceChart = ({ user, onLoginRequired }) => {
  const { t } = useLanguage();
  const [families, setFamilies] = useState([]);
  const [cities, setCities] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("area");

  const [selectedFamily, setSelectedFamily] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [days, setDays] = useState(30);
  const [selectedDate, setSelectedDate] = useState("");

  // Members (real commodity strings) of the currently-selected family.
  const familyMembers =
    families.find((f) => f.family === selectedFamily)?.members || [];

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
          // Group raw commodity strings into base families (Rice, Wheat, ...).
          // Rice/cotton variants live as their own commodity strings in the DB.
          const fams = buildFamilies(commoditiesData.data || []);
          const cityList = citiesData.data || [];

          setFamilies(fams);
          setCities(cityList);
          setSelectedFamily(fams[0]?.family || "");
          setSelectedCommodity(fams[0]?.members[0] || "");
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
  }, []);

  // Fetch cities based on the selected commodity
  useEffect(() => {
    let isMounted = true;

    const fetchCities = async () => {
      if (!selectedCommodity) return;

      try {
        const params = new URLSearchParams({ commodity: selectedCommodity });

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
  }, [selectedCommodity, selectedCity]);

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
  }, [selectedCommodity, selectedCity, days, selectedDate]);

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

  // Fall back to base family config when a variant has no dedicated entry.
  const currentConfig = getCommodityConfig(selectedCommodity);

  const displayUnit = data.length > 0 && data[data.length - 1]?.unit
    ? data[data.length - 1].unit.replace('Rs/', '').replace('(Maund)', 'Maund')
    : (selectedCommodity === 'Sugar' || selectedCommodity === 'Flour' ? 'Kg' : '40Kg Maund');

  const isEmpty = !loading && data.length === 0;

  // Render chart based on type
  const renderChart = () => {
    const isMobile = window.innerWidth < 640;
    const commonProps = {
      data,
      margin: { top: 10, right: isMobile ? 10 : 30, left: 5, bottom: 5 }
    };

    const xAxisProps = {
      dataKey: "date",
      tick: { fontSize: isMobile ? 10 : 13, fill: "#6b7280", fontWeight: 500 },
      interval: data.length > (isMobile ? 8 : 14) ? Math.floor(data.length / (isMobile ? 4 : 5)) : 0,
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
            <Line
              type="monotone"
              dataKey="price"
              stroke="url(#lineGradient)"
              strokeWidth={isMobile ? 2 : 2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#059669", stroke: "#fff", strokeWidth: 2 }}
            />
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
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="price" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
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
            <Area
              type="monotone"
              dataKey="price"
              stroke="url(#areaStroke)"
              strokeWidth={isMobile ? 2 : 2.5}
              fill="url(#areaGradient)"
            />
          </AreaChart>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
          {/* Commodity (family) Selection */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {families.map(({ family, members }) => (
              <CommodityButton
                key={family}
                commodity={family}
                config={getCommodityConfig(family)}
                isSelected={selectedFamily === family}
                onClick={() => {
                  setSelectedFamily(family);
                  setSelectedCommodity(members[0]);
                }}
              />
            ))}
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Variety / type Dropdown -- members of the selected family */}
            {familyMembers.length > 1 && (
              <DropdownSelect
                label={t("priceChart.variety")}
                icon={Leaf}
                value={selectedCommodity}
                options={familyMembers}
                onChange={(v) => handleProtectedAction(() => setSelectedCommodity(v))}
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
                  max={new Date().toISOString().split('T')[0]}
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
              <div className="flex gap-1">
                {TIME_PERIODS.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => handleProtectedAction(() => {
                      setDays(period.value);
                      setSelectedDate(""); // Clear date when period is selected
                    })}
                    className={`
                      flex-1 h-[42px] px-2 rounded-lg text-sm font-bold transition-all duration-200
                      ${(days === period.value && !selectedDate)
                        ? "bg-primary-600 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
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
          <div className="bg-gradient-to-r from-primary-50 to-emerald-50 dark:from-primary-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-primary-100 dark:border-primary-800/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${currentConfig.bg}`}>
                  {currentConfig.image ? (
                    <img src={currentConfig.image} alt={selectedCommodity} className="w-12 h-12 object-contain" />
                  ) : (
                    <span className="text-2xl">{currentConfig.emoji}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedCommodity} • {selectedCity}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      ₨{latestPrice.toLocaleString()}
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
                    <p className={`text-lg font-bold ${isPositive ? "text-green-700 dark:text-green-400" : isNegative ? "text-red-700 dark:text-red-400" : "text-gray-600"
                      }`}>
                      {isPositive ? "+" : ""}{priceChange.toFixed(1)}%
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
          </div>

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
