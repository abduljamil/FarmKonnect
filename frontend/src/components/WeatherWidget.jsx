import React, { useState, useEffect, useCallback } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  RefreshCw,
  CloudLightning,
  CloudFog,
  ChevronDown
} from "lucide-react";
import API_URL from "../config";
import { useLanguage } from "../contexts/LanguageContext";

const API_BASE = API_URL;

// Weather icons mapping
const weatherIcons = {
  clear: Sun,
  sunny: Sun,
  clouds: Cloud,
  cloudy: Cloud,
  rain: CloudRain,
  drizzle: CloudRain,
  snow: CloudSnow,
  wind: Wind,
  thunderstorm: CloudLightning,
  mist: CloudFog,
  fog: CloudFog,
  haze: CloudFog,
};

const WeatherWidget = ({ defaultCity = "Lahore" }) => {
  const { t } = useLanguage();
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(defaultCity);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch available cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch(`${API_BASE}/weather/cities`);
        const data = await response.json();
        if (data.success) {
          setCities(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch cities:", err);
      }
    };
    fetchCities();
  }, []);

  // Fetch weather data
  const fetchWeather = useCallback(async (city = selectedCity) => {
    setLoading(true);
    setError(null);

    try {
      const [currentRes, forecastRes] = await Promise.all([
        fetch(`${API_BASE}/weather/current?city=${encodeURIComponent(city)}`),
        fetch(`${API_BASE}/weather/forecast?city=${encodeURIComponent(city)}`)
      ]);

      const currentData = await currentRes.json();
      const forecastData = await forecastRes.json();

      if (currentData.success) {
        setWeather(currentData.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(currentData.message || "Failed to fetch weather");
      }

      if (forecastData.success) {
        setForecast(forecastData.data.forecast || []);
      }
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError(err.message || "Failed to load weather data");
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  // Initial fetch and on city change
  useEffect(() => {
    fetchWeather(selectedCity);
  }, [selectedCity, fetchWeather]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchWeather(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedCity, fetchWeather]);

  const handleCityChange = (e) => {
    setSelectedCity(e.target.value);
  };

  const handleRefresh = () => {
    fetchWeather();
  };

  const getWeatherIcon = (condition) => {
    const Icon = weatherIcons[condition?.toLowerCase()] || Sun;
    return Icon;
  };

  const getConditionColor = (condition) => {
    switch (condition?.toLowerCase()) {
      case "sunny":
      case "clear":
        return "text-amber-500";
      case "clouds":
      case "cloudy":
        return "text-gray-400";
      case "rain":
      case "drizzle":
        return "text-blue-500";
      case "snow":
        return "text-cyan-300";
      case "thunderstorm":
        return "text-purple-500";
      default:
        return "text-amber-500";
    }
  };

  // Loading state
  if (loading && !weather) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl dash-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <Cloud className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{t("weather.title")}</h3>
          </div>
        </div>
        <div className="p-8 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-500">{t("weather.loading")}</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !weather) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl dash-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <Cloud className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{t("weather.title")}</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            {t("weather.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  const CurrentIcon = weather ? getWeatherIcon(weather.current?.condition) : Sun;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl dash-card overflow-hidden flex flex-col lg:flex-row">
      {/* Left Panel: Header & Current Weather */}
      <div className="lg:w-2/5 p-5 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700 flex flex-col justify-between">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg shrink-0">
              <Cloud className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white leading-tight truncate">{t("weather.title")}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{weather?.location || selectedCity}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {cities.length > 0 && (
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={handleCityChange}
                  className="appearance-none bg-white/60 dark:bg-gray-800/60 border border-sky-200/50 dark:border-sky-700/50
                           text-gray-700 dark:text-gray-300 text-xs rounded-lg pl-2 pr-6 py-1.5
                           focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer backdrop-blur-sm"
                >
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
              title={t("priceChart.refresh")}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {weather && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {weather.current?.temp || "--"}
                  </span>
                  <span className="text-xl font-medium text-gray-500 dark:text-gray-400">°C</span>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize mt-0.5">
                  {weather.current?.description || weather.current?.condition || ""}
                </p>
              </div>
              <CurrentIcon className={`w-14 h-14 ${getConditionColor(weather.current?.condition)}`} />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-sky-200/50 dark:border-sky-800/30">
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{t("weather.feelsLike")}</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {weather.current?.feelsLike || "--"}°
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{t("weather.humidity")}</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {weather.current?.humidity || "--"}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{t("weather.wind")}</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {weather.current?.wind || "--"}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Panel: Forecast & Tip */}
      <div className="lg:w-3/5 p-5 flex flex-col justify-center">
        {weather && forecast.length > 0 && (
          <div className="flex-1 flex flex-col justify-center">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{t("weather.fiveDay")}</h4>
            <div className="flex justify-between items-center gap-2">
              {forecast.map((day, index) => {
                const DayIcon = getWeatherIcon(day.condition);
                return (
                  <div key={index} className="text-center flex-1 py-2 px-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{day.day}</p>
                    <DayIcon className={`w-5 h-5 mx-auto mb-1.5 ${getConditionColor(day.condition)}`} />
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{day.high}°</p>
                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{day.low}°</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {weather?.farmingTip && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg shrink-0">
                <span className="text-sm">🌾</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-0.5">{t("weather.farmingTip")}</p>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-snug">{weather.farmingTip}</p>
              </div>
            </div>
          </div>
        )}

        {lastUpdated && (
          <div className="mt-3 text-right">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
              {t("weather.updated")} {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget;
