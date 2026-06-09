
import React, { useState, useEffect, useCallback } from "react";
import API_URL from "../config";
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
import socketService from "../utils/socket";
import { COMMODITY_OPTIONS } from "../utils/commodities";
import { useLanguage } from "../contexts/LanguageContext";

// All commodities surfaced in the alert dropdown (sourced from the shared
// catalog so new rice variants / Seed Cotton (Phutti) etc. show up
// automatically). Each item: { value, label, icon }.
const COMMODITIES = COMMODITY_OPTIONS;

// Commodities that have a `variety` sub-field. Our ingested data writes
// variety=null for every row, but the base "Rice"/"Cotton" rows still
// pull varieties from the API for backward compatibility with legacy data.
const COMMODITIES_WITH_VARIETIES = ["Rice", "Cotton"];

const AlertItem = ({ alert, onDelete, onReactivate }) => {
  const { t } = useLanguage();
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
      <div className={`p-4 rounded-xl border transition-all w-72 shrink-0 snap-start flex flex-col justify-between h-full ${isTriggered
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
      }`}>
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">{commodityIcon}</span>
            <div className="min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                {alert.commodity}
                {alert.variety && <span className="text-gray-500"> ({alert.variety})</span>}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {alert.condition === "above" ? t("priceAlerts.conditionAbove") : t("priceAlerts.conditionBelow")} ₨{alert.targetPrice?.toLocaleString()}
                {alert.city && <span> {t("priceAlerts.inCity")} {alert.city}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center shrink-0">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors text-gray-400 hover:text-red-500"
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
          <div className="mb-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-gray-500 dark:text-gray-400">
                {t("priceAlerts.currentLabel")}: ₨{alert.currentPrice?.toLocaleString()}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {t("priceAlerts.targetLabel")}: ₨{alert.targetPrice?.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isTriggered ? "bg-green-500" : "bg-emerald-500"
                  }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate pr-2">
          {isTriggered && alert.triggeredAt 
            ? `${t("priceAlerts.triggeredOn")} ${new Date(alert.triggeredAt).toLocaleDateString()}`
            : `${t("priceAlerts.createdOn")} ${new Date(alert.createdAt).toLocaleDateString()}`
          }
        </p>
        {isTriggered ? (
          <button
            onClick={() => onReactivate(alert._id)}
            className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-md hover:bg-green-200 dark:hover:bg-green-900/70 transition-colors shrink-0"
          >
            <Check className="w-3 h-3" />
            {t("priceAlerts.triggered")}
          </button>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded-md shrink-0">
            <BellRing className="w-3 h-3" />
            {t("priceAlerts.active")}
          </span>
        )}
      </div>
    </div>
  );
};

const CreateAlertModal = ({ isOpen, onClose, onCreated }) => {
  const { t } = useLanguage();
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
            {t("priceAlerts.createModal")}
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
              {t("priceAlerts.form.commodity")} *
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
                {t("priceAlerts.variety")}
              </label>
              <div className="relative">
                {loadingVarieties ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    <span className="text-sm text-gray-500">{t("priceAlerts.loadingVarieties")}</span>
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
                      <option value="">{t("priceAlerts.allVarieties")}</option>
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
                    {t("priceAlerts.noVarieties")}
                  </div>
                )}
              </div>
              {varieties.length > 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("priceAlerts.varietyHint")}
                </p>
              )}
            </div>
          )}

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("priceAlerts.cityLabel")} *
            </label>
            <div className="relative">
              {loadingCities ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">{t("priceAlerts.loadingCities")}</span>
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
                    <option value="">{t("priceAlerts.selectCity")}</option>
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
                  {t("priceAlerts.noCities")}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("priceAlerts.cityHint")}
            </p>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("priceAlerts.alertWhen")} *
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
                {t("priceAlerts.risesAbove")}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, condition: "below" })}
                className={`flex-1 py-2.5 px-4 rounded-lg border font-medium transition-colors ${formData.condition === "below"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}
              >
                {t("priceAlerts.dropsBelow")}
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
                  {currentPrice?.isSelectedCity ? t("priceAlerts.currentPrice") : t("priceAlerts.referencePrice")}
                  {!currentPrice?.isSelectedCity && <span className="text-gray-500 ml-1">{t("priceAlerts.sample")}</span>}
                </p>
                {loadingPrice ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span className="text-sm text-gray-500">{t("common.loading")}</span>
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
                    {t("priceAlerts.priceNotAvail")}
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
                ✓ {t("priceAlerts.showingPrice", { city: currentPrice.city })}
              </p>
            )}
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("priceAlerts.targetPriceLabel")} *
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
                {t("priceAlerts.creating")}
              </>
            ) : (
              <>
                <Bell className="w-5 h-5" />
                {t("priceAlerts.create")}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

const PriceAlertsPanel = ({ user }) => {
  const { t } = useLanguage();
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
      await alertsApi.deleteAlert(alertId);
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
      <div className="bg-white dark:bg-gray-800 rounded-3xl dash-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t("priceAlerts.title")}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("priceAlerts.getNotified")}</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-8 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t("priceAlerts.signInToCreate")}</p>
          <a
            href="/signin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            {t("priceAlerts.signIn")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-3xl dash-card overflow-hidden flex flex-col lg:flex-row h-full">
        {/* Header / Add Alert Panel */}
        <div className="lg:w-1/4 p-5 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col justify-center items-start shrink-0">
          <div className="flex items-center gap-3 w-full mb-4">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl shrink-0">
              <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white leading-tight truncate">{t("priceAlerts.title")}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {t("priceAlerts.statsLine", { active: activeCount, triggered: triggeredCount })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("priceAlerts.addAlert")}
          </button>
        </div>

        {/* Alerts List */}
        <div className="lg:w-3/4 p-5 bg-white dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[120px]">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("priceAlerts.loadingAlerts")}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full min-h-[120px]">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-red-500 dark:text-red-400">{error}</p>
                <button
                  onClick={fetchAlerts}
                  className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  {t("priceAlerts.tryAgain")}
                </button>
              </div>
            </div>
          ) : alerts.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x h-full items-stretch">
              {alerts.map((alert) => (
                <AlertItem
                  key={alert._id}
                  alert={alert}
                  onDelete={handleDelete}
                  onReactivate={handleReactivate}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[120px]">
              <div className="text-center">
                <Bell className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t("priceAlerts.noAlerts")}</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-xs font-bold"
                >
                  <Plus className="w-3 h-3" />
                  {t("priceAlerts.createFirst")}
                </button>
              </div>
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
