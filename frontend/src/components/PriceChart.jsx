import React, { useMemo, memo, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MapPin, ChevronDown } from "lucide-react";

// Commodity data with varieties and base prices
const COMMODITIES = {
  wheat: {
    name: "Wheat",
    icon: "🌾",
    basePrice: 4200,
    varieties: [
      { id: "faisalabad-2008", name: "Faisalabad-2008" },
      { id: "galaxy-2013", name: "Galaxy-2013" },
      { id: "punjab-2011", name: "Punjab-2011" },
      { id: "seher-2006", name: "Seher-2006" },
    ],
  },
  rice: {
    name: "Rice",
    icon: "🍚",
    basePrice: 8500,
    varieties: [
      { id: "basmati-super", name: "Basmati Super" },
      { id: "basmati-385", name: "Basmati 385" },
      { id: "basmati-515", name: "Basmati 515" },
      { id: "irri-6", name: "IRRI-6" },
      { id: "irri-9", name: "IRRI-9" },
      { id: "kainat", name: "Kainat" },
      { id: "pk-386", name: "PK-386" },
    ],
  },
  maize: {
    name: "Maize",
    icon: "🌽",
    basePrice: 3200,
    varieties: [
      { id: "yellow", name: "Yellow Maize" },
      { id: "white", name: "White Maize" },
      { id: "hybrid", name: "Hybrid" },
    ],
  },
  sugar: {
    name: "Sugar",
    icon: "🍬",
    basePrice: 140,
    varieties: [
      { id: "refined", name: "Refined (Grade A)" },
      { id: "mill", name: "Mill Sugar" },
      { id: "desi", name: "Desi" },
    ],
  },
  cotton: {
    name: "Cotton",
    icon: "☁️",
    basePrice: 18000,
    varieties: [
      { id: "phutti", name: "Phutti (Seed Cotton)" },
      { id: "banola", name: "Banola" },
      { id: "lint", name: "Cotton Lint" },
    ],
  },
};

// Major cities/mandis in Punjab
const CITIES = [
  { id: "lahore", name: "Lahore" },
  { id: "faisalabad", name: "Faisalabad" },
  { id: "multan", name: "Multan" },
  { id: "rawalpindi", name: "Rawalpindi" },
  { id: "gujranwala", name: "Gujranwala" },
  { id: "sialkot", name: "Sialkot" },
  { id: "bahawalpur", name: "Bahawalpur" },
  { id: "sargodha", name: "Sargodha" },
  { id: "okara", name: "Okara" },
  { id: "sahiwal", name: "Sahiwal" },
];

// Translation helper
const translations = {
  "dashboard.priceChart": "Price Chart",
  "dashboard.chartDescription": "Historical data and ML-based price forecasts",
  "dashboard.historicalData": "Historical Data",
  "dashboard.mlForecast": "ML Forecast",
  "dashboard.days": "days",
  "dashboard.chartSource": "Source",
  "dashboard.scraped": "Scraped",
  "dashboard.selectVariety": "Select Variety",
  "dashboard.selectCity": "Select City",
  "dashboard.currentPrice": "Current Price",
  "dashboard.change": "Change",
};

const t = (key) => translations[key] || key;

// Generate mock price data based on commodity, variety, and city
const generateMockData = (commodityKey, varietyId, cityId) => {
  const data = [];
  const today = new Date();
  const commodity = COMMODITIES[commodityKey];
  
  // Use commodity, variety, and city to create deterministic but varied pricing
  const varietyIndex = commodity.varieties.findIndex(v => v.id === varietyId);
  const cityIndex = CITIES.findIndex(c => c.id === cityId);
  const priceMod = (varietyIndex * 50) + (cityIndex * 30);
  const basePrice = commodity.basePrice + priceMod;

  // Generate 30 days of historical data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const variance = Math.sin((i + varietyIndex) / 5) * (basePrice * 0.05);
    const cityVariance = Math.cos((i + cityIndex) / 7) * (basePrice * 0.03);
    const noise = (Math.random() - 0.5) * (basePrice * 0.02);

    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      historical: Math.round(basePrice + variance + cityVariance + noise),
      forecast: null,
      type: "historical",
    });
  }

  // Generate 7 days of forecast data
  const lastHistoricalPrice = data[data.length - 1].historical;
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const trend = Math.sin(i / 3) * (basePrice * 0.04);
    const forecast = Math.round(lastHistoricalPrice + trend);

    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      historical: null,
      forecast: forecast,
      type: "forecast",
    });
  }

  return data;
};

// Custom tooltip component
const CustomTooltip = memo(({ active, payload }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const value = payload[0].value;
    return (
      <div className="bg-white dark:bg-gray-900 p-3 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{dataPoint.date}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          {payload[0].name}: {value?.toLocaleString()} PKR
        </p>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = "CustomTooltip";

const PriceChart = () => {
  // State for selections
  const [selectedCommodity, setSelectedCommodity] = useState("wheat");
  const [selectedVariety, setSelectedVariety] = useState(COMMODITIES.wheat.varieties[0].id);
  const [selectedCity, setSelectedCity] = useState("lahore");

  // Handle commodity change
  const handleCommodityChange = useCallback((commodityKey) => {
    setSelectedCommodity(commodityKey);
    // Reset variety to first option of new commodity
    setSelectedVariety(COMMODITIES[commodityKey].varieties[0].id);
  }, []);

  // Get current commodity data
  const currentCommodity = COMMODITIES[selectedCommodity];
  const currentVariety = currentCommodity.varieties.find(v => v.id === selectedVariety);
  const currentCity = CITIES.find(c => c.id === selectedCity);

  // Generate chart data based on selections
  const data = useMemo(
    () => generateMockData(selectedCommodity, selectedVariety, selectedCity),
    [selectedCommodity, selectedVariety, selectedCity]
  );

  // Calculate current price and change
  const currentPrice = data.find(d => d.historical !== null && d.type === "historical");
  const latestPrice = data.filter(d => d.historical !== null).pop()?.historical || 0;
  const firstPrice = data[0]?.historical || 0;
  const priceChange = firstPrice ? ((latestPrice - firstPrice) / firstPrice * 100).toFixed(1) : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {/* Commodity Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto scrollbar-hide">
          {Object.entries(COMMODITIES).map(([key, commodity]) => (
            <button
              key={key}
              onClick={() => handleCommodityChange(key)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                border-b-2 transition-colors duration-200
                ${selectedCommodity === key
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }
              `}
            >
              <span className="text-lg">{commodity.icon}</span>
              <span>{commodity.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Filters Row: Variety + City */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Variety Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t("dashboard.selectVariety")}
            </label>
            <div className="relative">
              <select
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
                className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                         text-gray-900 dark:text-white text-sm rounded-lg px-4 py-2.5 pr-10
                         focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {currentCommodity.varieties.map((variety) => (
                  <option key={variety.id} value={variety.id}>
                    {variety.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* City Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              <MapPin className="inline w-3 h-3 mr-1" />
              {t("dashboard.selectCity")}
            </label>
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                         text-gray-900 dark:text-white text-sm rounded-lg px-4 py-2.5 pr-10
                         focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {CITIES.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Current Price Display */}
          <div className="flex-1 min-w-[200px] bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t("dashboard.currentPrice")}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {latestPrice.toLocaleString()}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">PKR</span>
              <span className={`text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {isPositive ? "↑" : "↓"} {Math.abs(priceChange)}%
              </span>
            </div>
          </div>
        </div>

        {/* Chart Title */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentCommodity.icon} {currentVariety?.name} - {currentCity?.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("dashboard.chartDescription")}
          </p>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mb-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-600"></div>
            <span className="text-gray-700 dark:text-gray-300">
              {t("dashboard.historicalData")} (30 {t("dashboard.days")})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500 border-t-2 border-dashed border-red-500"></div>
            <span className="text-gray-700 dark:text-gray-300">
              {t("dashboard.mlForecast")} (7 {t("dashboard.days")})
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                interval={Math.floor(data.length / 7)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickFormatter={(value) => value.toLocaleString()}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="historical"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                name={t("dashboard.historicalData")}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={t("dashboard.mlForecast")}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("dashboard.chartSource")}: AMIS Punjab & PBS ({t("dashboard.scraped")})
          </p>
        </div>
      </div>
    </div>
  );
};

export default memo(PriceChart);
