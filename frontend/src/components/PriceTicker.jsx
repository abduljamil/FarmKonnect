import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import API_URL from "../config";

const PriceTicker = ({ prices = [] }) => {
  const [livePrices, setLivePrices] = useState(() => {
    try {
      const cached = sessionStorage.getItem("ticker_prices_cache");
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.error("Cache parse error:", e);
      return [];
    }
  });
  const [isPaused, setIsPaused] = useState(false);

  // Default sample data if no prices provided
  const defaultPrices = [
    { commodity: "Wheat", price: 4200, change: 2.3, unit: "100kg" },
    { commodity: "Rice (Basmati)", price: 8500, change: -1.1, unit: "100kg" },
    { commodity: "Maize", price: 2800, change: 0.8, unit: "100kg" },
    { commodity: "Cotton", price: 15200, change: 3.5, unit: "40kg" },
    { commodity: "Sugarcane", price: 350, change: -0.5, unit: "40kg" },
    { commodity: "Rice (IRRI)", price: 5200, change: 1.2, unit: "100kg" },
  ];

  useEffect(() => {
    let isMounted = true;

    const fetchPrices = async () => {
      try {
        const response = await fetch(`${API_URL}/prices/latest`, {
          credentials: 'include'
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch prices");
        }

        if (isMounted) {
          const TARGET_COMMODITIES = ["Wheat", "Rice", "Cotton", "Sugar", "Maize", "Flour"];
          const mapped = (data.data || [])
            .filter(item => TARGET_COMMODITIES.includes(item.commodity))
            .map((item) => {
              // Clean up unit display
              let displayUnit = item.unit || "40Kg";
              if (displayUnit.startsWith("Rs/")) {
                displayUnit = displayUnit.substring(3);
              }

              return {
                commodity: item.variety ? `${item.commodity} (${item.variety})` : item.commodity,
                city: item.city,
                price: item.price,
                unit: displayUnit,
                change: item.change, // Include price change from API
              };
            });
          if (mapped.length > 0) {
            setLivePrices(mapped);
            // Update cache
            sessionStorage.setItem("ticker_prices_cache", JSON.stringify(mapped));
          }
        }
      } catch (error) {
        console.error("Price ticker fetch error:", error);
      }
    };

    fetchPrices();
    return () => {
      isMounted = false;
    };
  }, []);

  // Always show data - use live prices if available, otherwise default
  const tickerData = prices.length > 0 ? prices : livePrices.length > 0 ? livePrices : defaultPrices;

  // Double the data for seamless infinite scroll
  const doubledData = [...tickerData, ...tickerData];

  return (
    <div
      className="w-full bg-primary-50 dark:bg-gray-950 border-b border-primary-100 dark:border-gray-800 overflow-hidden cursor-pointer"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative flex items-center h-10 overflow-hidden">
        {/* Gradient masks for smooth edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-primary-50 dark:from-gray-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-primary-50 dark:from-gray-950 to-transparent z-10 pointer-events-none" />

        {/* Scrolling content */}
        <div
          className="flex whitespace-nowrap animate-ticker will-change-transform"
          style={{
            animation: 'ticker 120s linear infinite',
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {doubledData.map((item, index) => (
            <div
              key={`${item.commodity}-${item.city || 'default'}-${index}`}
              className="inline-flex items-center gap-2 px-4 border-r border-primary-200 dark:border-gray-700/50 flex-shrink-0"
            >
              <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">
                {item.commodity}
              </span>
              {item.city && (
                <span className="text-gray-500 dark:text-gray-500 text-xs">
                  @ {item.city}
                </span>
              )}
              <span className="text-gray-900 dark:text-white font-semibold text-sm">
                ₨{item.price?.toLocaleString() || '0'}
              </span>
              {typeof item.change === "number" && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${item.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {item.change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(item.change)}%
                </span>
              )}
              <span className="text-gray-500 dark:text-gray-500 text-xs">/{item.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceTicker;
