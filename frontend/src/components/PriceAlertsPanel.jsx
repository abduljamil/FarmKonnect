
import React, { useState, useEffect, useCallback } from "react"; import API_URL from "../config";
import {
  Bell,
  BellRing,
  Plus,
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ChevronDown,
  Loader2,
  Volume2
} from "lucide-react";
import alertsApi from "../utils/alertsApi";
import reviewsAPI from "../utils/reviewsApi";
import socketService from "../utils/socket";

const COMMODITIES = [
  { value: "Wheat", label: "Wheat", icon: "🌾" },
  { value: "Rice", label: "Rice", icon: "🍚" },
  { value: "Cotton", label: "Cotton", icon: "☁️" },
  { value: "Sugar", label: "Sugar", icon: "🍬" },
  { value: "Maize", label: "Maize", icon: "🌽" },
  { value: "Flour", label: "Flour", icon: "🥖" },
];

// Commodities that have varieties
const COMMODITIES_WITH_VARIETIES = ["Rice", "Cotton"];

const AlertItem = ({ alert, onDelete, onReactivate }) => {
  const [deleting, setDeleting] = useState(false);
  const isTriggered = alert.status === "triggered";

  const progress = alert.currentPrice
    ? (alert.condition === "above"
      ? Math.min((alert.currentPrice / alert.targetPrice) * 100, 100)
      : Math.min((alert.targetPrice / alert.currentPrice) * 100, 100))
    : 50;

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(alert._id);
    setDeleting(false);
  };

  const commodityIcon = COMMODITIES.find(c => c.value === alert.commodity)?.icon || "🌿";

  return (
    <div className={`p-4 rounded-xl border transition-all ${isTriggered
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
      }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{commodityIcon}</span>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
              {alert.commodity}
              {alert.variety && <span className="text-gray-500"> ({alert.variety})</span>}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {alert.condition === "above" ? "Price rises above" : "Price drops below"} ₨{alert.targetPrice?.toLocaleString()}
              {alert.city && <span> in {alert.city}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isTriggered ? (
            <button
              onClick={() => onReactivate(alert._id)}
              className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full hover:bg-green-200 dark:hover:bg-green-900/70 transition-colors"
            >
              <Check className="w-3 h-3" />
              Triggered
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded-full">
              <BellRing className="w-3 h-3" />
              Active
            </span>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors ml-1 text-gray-400 hover:text-red-500"
          >
            {deleting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {alert.currentPrice && (
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">
              Current: ₨{alert.currentPrice?.toLocaleString()}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              Target: ₨{alert.targetPrice?.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isTriggered ? "bg-green-500" : "bg-emerald-500"
                }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Created {new Date(alert.createdAt).toLocaleDateString()}
        {isTriggered && alert.triggeredAt && (
          <span> · Triggered {new Date(alert.triggeredAt).toLocaleDateString()}</span>
        )}
      </p>
    </div>
  );
};

const CreateAlertModal = ({ isOpen, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    commodity: "Wheat",
    variety: "",
    city: "",
    condition: "above",
    targetPrice: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [varieties, setVarieties] = useState([]);
  const [loadingVarieties, setLoadingVarieties] = useState(false);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Check if selected commodity has varieties
  const hasVarieties = COMMODITIES_WITH_VARIETIES.includes(formData.commodity);

  // Fetch varieties when commodity changes
  const fetchVarieties = useCallback(async (commodity) => {
    if (!COMMODITIES_WITH_VARIETIES.includes(commodity)) {
      setVarieties([]);
      return;
    }

    setLoadingVarieties(true);
    try {
      const response = await fetch(
        `${API_URL}/prices/varieties/${encodeURIComponent(commodity)}`
      );
      const data = await response.json();

      if (response.ok && data.data) {
        setVarieties(data.data);
      } else {
        setVarieties([]);
      }
    } catch (err) {
      console.error("Failed to fetch varieties:", err);
      setVarieties([]);
    } finally {
      setLoadingVarieties(false);
    }
  }, []);

  // Fetch cities for selected commodity and variety
  const fetchCities = useCallback(async (commodity, variety) => {
    setLoadingCities(true);
    try {
      let url = `${API_URL}/prices/cities-by-filters?commodity=${encodeURIComponent(commodity)}`;
      if (variety) {
        url += `&variety=${encodeURIComponent(variety)}`;
      }
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.data) {
        setCities(data.data);
      } else {
        setCities([]);
      }
    } catch (err) {
      console.error("Failed to fetch cities:", err);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  // Fetch current price for selected commodity/variety/city
  const fetchCurrentPrice = useCallback(async (commodity, variety, city) => {
    setLoadingPrice(true);
    try {
      const response = await fetch(`${API_URL}/prices/latest`);
      const data = await response.json();

      if (response.ok && data.data) {
        // Find matching price - filter by commodity, optionally variety, and optionally city
        const matchingPrices = data.data.filter(item => {
          if (item.commodity !== commodity) return false;
          if (variety && item.variety !== variety) return false;
          if (city && item.city !== city) return false;
          return true;
        });

        if (matchingPrices.length > 0) {
          // Get the first matching price
          const priceData = matchingPrices[0];
          setCurrentPrice({
            price: priceData.price,
            unit: priceData.unit?.replace('Rs/', '') || '40Kg (Maund)',
            city: priceData.city,
            variety: priceData.variety,
            isSelectedCity: !!city, // Track if user selected a specific city
          });
        } else {
          setCurrentPrice(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch current price:", err);
      setCurrentPrice(null);
    } finally {
      setLoadingPrice(false);
    }
  }, []);

  // Fetch varieties when modal opens or commodity changes
  useEffect(() => {
    if (isOpen) {
      fetchVarieties(formData.commodity);
    }
  }, [isOpen, formData.commodity, fetchVarieties]);

  // Fetch cities when modal opens or commodity/variety changes
  useEffect(() => {
    if (isOpen) {
      fetchCities(formData.commodity, formData.variety);
    }
  }, [isOpen, formData.commodity, formData.variety, fetchCities]);

  // Fetch current price when commodity, variety, or city changes
  useEffect(() => {
    if (isOpen) {
      fetchCurrentPrice(formData.commodity, formData.variety, formData.city);
    }
  }, [isOpen, formData.commodity, formData.variety, formData.city, fetchCurrentPrice]);

  // Reset variety and city when commodity changes
  const handleCommodityChange = (commodity) => {
    setFormData({
      ...formData,
      commodity,
      variety: "", // Reset variety when commodity changes
      city: "", // Reset city when commodity changes
    });
  };

  // Reset city when variety changes (optional, but cities may differ by variety)
  const handleVarietyChange = (variety) => {
    setFormData({
      ...formData,
      variety,
      city: "", // Reset city when variety changes
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await alertsApi.createAlert({
        ...formData,
        targetPrice: parseFloat(formData.targetPrice),
        variety: formData.variety || null,
        city: formData.city || null,
      });

      if (response.data.success) {
        onCreated(response.data.data);
        onClose();
        setFormData({
          commodity: "Wheat",
          variety: "",
          city: "",
          condition: "above",
          targetPrice: "",
        });
        setVarieties([]);
        setCities([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create alert");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Price Alert
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Commodity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Commodity *
            </label>
            <div className="relative">
              <select
                value={formData.commodity}
                onChange={(e) => handleCommodityChange(e.target.value)}
                className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                         text-gray-900 dark:text-white rounded-lg px-4 py-2.5 pr-10
                         focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {COMMODITIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Variety - Only shown for commodities that have varieties */}
          {hasVarieties && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Variety (Optional)
              </label>
              <div className="relative">
                {loadingVarieties ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    <span className="text-sm text-gray-500">Loading varieties...</span>
                  </div>
                ) : varieties.length > 0 ? (
                  <>
                    <select
                      value={formData.variety}
                      onChange={(e) => handleVarietyChange(e.target.value)}
                      className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                               text-gray-900 dark:text-white rounded-lg px-4 py-2.5 pr-10
                               focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">All Varieties</option>
                      {varieties.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </>
                ) : (
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500">
                    No varieties available
                  </div>
                )}
              </div>
              {varieties.length > 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave empty to be alerted for any variety
                </p>
              )}
            </div>
          )}

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              City *
            </label>
            <div className="relative">
              {loadingCities ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Loading cities...</span>
                </div>
              ) : cities.length > 0 ? (
                <>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                             text-gray-900 dark:text-white rounded-lg px-4 py-2.5 pr-10
                             focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Select a city to see price</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </>
              ) : (
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500">
                  No cities available for this selection
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select a city to see its current price
            </p>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Alert when price... *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, condition: "above" })}
                className={`flex-1 py-2.5 px-4 rounded-lg border font-medium transition-colors ${formData.condition === "above"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}
              >
                Rises Above ↑
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, condition: "below" })}
                className={`flex-1 py-2.5 px-4 rounded-lg border font-medium transition-colors ${formData.condition === "below"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}
              >
                Drops Below ↓
              </button>
            </div>
          </div>

          {/* Current Price Display */}
          <div className={`p-4 rounded-xl border ${currentPrice?.isSelectedCity
            ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-emerald-200 dark:border-emerald-700"
            : "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border-gray-200 dark:border-gray-700"
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                  {currentPrice?.isSelectedCity ? "Current Price" : "Reference Price"}
                  {!currentPrice?.isSelectedCity && <span className="text-gray-500 ml-1">(Sample)</span>}
                </p>
                {loadingPrice ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span className="text-sm text-gray-500">Loading...</span>
                  </div>
                ) : currentPrice ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      ₨{currentPrice.price?.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      /{currentPrice.unit}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Price not available for this selection
                  </span>
                )}
              </div>
              {currentPrice && (
                <div className="text-right">
                  <div className={`px-2 py-1 rounded-md ${currentPrice.isSelectedCity
                    ? "bg-emerald-100 dark:bg-emerald-900/50"
                    : "bg-gray-100 dark:bg-gray-700"
                    }`}>
                    <p className={`text-xs font-medium ${currentPrice.isSelectedCity
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-gray-600 dark:text-gray-400"
                      }`}>
                      📍 {currentPrice.city}
                    </p>
                  </div>
                  {currentPrice.variety && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {currentPrice.variety}
                    </p>
                  )}
                </div>
              )}
            </div>
            {currentPrice?.isSelectedCity && (
              <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 rounded-md">
                ✓ Showing current price for <strong>{currentPrice.city}</strong>
              </p>
            )}
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Price (PKR) *
            </label>
            <input
              type="number"
              value={formData.targetPrice}
              onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
              placeholder={currentPrice ? `e.g., ${Math.round(currentPrice.price * (formData.condition === 'above' ? 1.1 : 0.9))}` : "e.g., 5000"}
              min="1"
              required
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                       text-gray-900 dark:text-white rounded-lg px-4 py-2.5
                       focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {currentPrice && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.condition === 'above'
                  ? `Suggested: ₨${Math.round(currentPrice.price * 1.05).toLocaleString()} - ₨${Math.round(currentPrice.price * 1.15).toLocaleString()} (5-15% above current)`
                  : `Suggested: ₨${Math.round(currentPrice.price * 0.85).toLocaleString()} - ₨${Math.round(currentPrice.price * 0.95).toLocaleString()} (5-15% below current)`
                }
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !formData.targetPrice}
            className="w-full py-3 px-4 bg-emerald-600 text-white font-semibold rounded-lg
                     hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Bell className="w-5 h-5" />
                Create Alert
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

const PriceAlertsPanel = ({ user }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await alertsApi.getAlerts();
      if (response.data.success) {
        setAlerts(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      setError("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Listen for price alert triggers via Socket.io
  useEffect(() => {
    if (!user) return;

    const handleAlertTriggered = (data) => {
      // Update the alert in the local state
      setAlerts(prevAlerts =>
        prevAlerts.map(alert =>
          (alert && alert._id === data.alert?._id)
            ? {
              ...alert,
              status: "triggered",
              triggeredAt: new Date().toISOString(),
              currentPrice: data.alert.currentPrice
            }
            : alert
        )
      );
    };

    // Connect socket with authentication token
    if (user.token) {
      socketService.connect(user.token);
    }
    socketService.onPriceAlertTriggered(handleAlertTriggered, "price_alerts_panel");

    return () => {
      socketService.offPriceAlertTriggered("price_alerts_panel");
    };
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDelete = async (alertId) => {
    try {
      await reviewsAPI.deletePriceAlert(alertId);
      setAlerts(alerts.filter(a => a && a._id !== alertId));
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  const handleReactivate = async (alertId) => {
    try {
      const response = await alertsApi.reactivateAlert(alertId);
      if (response.data.success) {
        setAlerts(alerts.map(a =>
          (a && a._id === alertId) ? { ...a, status: "active", triggeredAt: null } : a
        ));
      }
    } catch (err) {
      console.error("Failed to reactivate alert:", err);
    }
  };

  const handleAlertCreated = (newAlert) => {
    // Add new alert to the beginning of the list
    setAlerts(prevAlerts => [newAlert, ...prevAlerts]);
    // Close modal
    setShowCreateModal(false);
  };

  const activeCount = alerts.filter(a => a.status === "active").length;
  const triggeredCount = alerts.filter(a => a.status === "triggered").length;

  // Guest state
  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Price Alerts</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Get notified on price changes</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-8 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">Sign in to create price alerts</p>
          <a
            href="/signin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Price Alerts</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeCount} active · {triggeredCount} triggered
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Alert
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-8 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">Loading alerts...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-500 dark:text-red-400">{error}</p>
              <button
                onClick={fetchAlerts}
                className="mt-2 text-sm text-emerald-600 hover:text-emerald-700"
              >
                Try again
              </button>
            </div>
          ) : alerts.length > 0 ? (
            alerts.map((alert) => (
              <AlertItem
                key={alert._id}
                alert={alert}
                onDelete={handleDelete}
                onReactivate={handleReactivate}
              />
            ))
          ) : (
            <div className="py-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No price alerts set</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Your First Alert
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Alert Modal */}
      <CreateAlertModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleAlertCreated}
      />
    </>
  );
};

export default PriceAlertsPanel;
