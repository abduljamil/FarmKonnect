import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";
import PriceChart from "../components/PriceChart";
import Ltr from "../components/Ltr";
import API_URL from "../config";
import { useLanguage } from "../contexts/LanguageContext";
import { getCommodityConfig, DISPLAY_COMMODITIES } from "../utils/commodities";

// ── Tiny sparkline (green up / red down) ───────────────────────────────────
const Sparkline = ({ points, up, className = "" }) => {
  if (!points || points.length < 2) {
    return <div className={className} />;
  }
  const w = 120, h = 34, pad = 4;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const sx = w / (points.length - 1);
  const d = points
    .map((v, i) => `${i ? "L" : "M"}${(i * sx).toFixed(1)},${(pad + (1 - (v - min) / range) * (h - 2 * pad)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={up ? "#059669" : "#e11d48"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

// ── A single watchlist row ─────────────────────────────────────────────────
const MarketRow = ({ m, selected, onSelect }) => {
  const config = getCommodityConfig(m.commodity);
  const isSel = selected === m.commodity;
  return (
    <button
      onClick={() => onSelect(m.commodity)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-[3px] ${
        isSel
          ? "bg-primary-50/70 dark:bg-primary-900/20 border-primary-500"
          : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40"
      }`}
    >
      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 grid place-items-center flex-shrink-0 overflow-hidden">
        {config.image ? (
          <img src={config.image} alt={m.commodity} className="w-7 h-7 object-contain" />
        ) : (
          <span className="text-lg">{config.emoji}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold truncate ${isSel ? "text-primary-800 dark:text-primary-300" : "text-gray-800 dark:text-gray-100"}`}>
          {m.commodity}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{m.city}</p>
      </div>
      <Sparkline points={m.spark} up={m.up} className="w-12 h-7 flex-shrink-0" />
      <div className="text-right flex-shrink-0 w-[70px]">
        <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
          <Ltr>₨{Math.round(m.price).toLocaleString()}</Ltr>
        </p>
        <p className={`text-[11px] font-semibold tabular-nums ${m.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          <Ltr>{m.changePct > 0 ? "+" : ""}{m.changePct.toFixed(1)}%</Ltr>
        </p>
      </div>
    </button>
  );
};

const PriceTrends = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(DISPLAY_COMMODITIES[0] || "Wheat");

  useEffect(() => {
    const u = sessionStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // Fetch the market snapshot: latest price per commodity + a 30-day sparkline.
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const res = await fetch(`${API_URL}/prices/latest?limit=100`);
        const json = await res.json();
        if (!mounted) return;
        const latest = json.data || [];

        // One row per display commodity (first city seen).
        const byCommodity = {};
        for (const item of latest) {
          if (!DISPLAY_COMMODITIES.includes(item.commodity)) continue;
          if (!byCommodity[item.commodity]) byCommodity[item.commodity] = item;
        }
        const picks = DISPLAY_COMMODITIES.filter((c) => byCommodity[c]).map((c) => byCommodity[c]);

        const withSpark = await Promise.all(
          picks.map(async (p) => {
            try {
              const params = new URLSearchParams({ commodity: p.commodity, city: p.city, days: "30" });
              if (p.variety) params.set("variety", p.variety);
              const hr = await fetch(`${API_URL}/prices/history?${params.toString()}`);
              const hj = await hr.json();
              const pts = (hj.data || []).map((d) => d.price).filter((v) => v != null);
              const first = pts[0];
              const last = pts[pts.length - 1];
              const changePct = first ? ((last - first) / first) * 100 : 0;
              return { commodity: p.commodity, city: p.city, price: p.price, unit: p.unit, changePct, up: changePct >= 0, spark: pts };
            } catch {
              return { commodity: p.commodity, city: p.city, price: p.price, unit: p.unit, changePct: 0, up: true, spark: [] };
            }
          })
        );

        if (mounted) {
          setMarkets(withSpark);
          if (withSpark.length && !withSpark.some((m) => m.commodity === selected)) {
            setSelected(withSpark[0].commodity);
          }
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedByChange = [...markets].sort((a, b) => b.changePct - a.changePct);

  return (
    <div className="relative min-h-screen dash-aurora bg-[#f6f7f9] dark:bg-gray-950">
      {user ? <Navbar user={user} /> : <GuestNavbar />}

      <div className="relative z-10 pt-16 sm:pt-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Hero band */}
          <div className="relative overflow-hidden rounded-3xl hero-mesh text-white dash-card">
            <div className="absolute inset-0 hero-grain opacity-[0.12] mix-blend-overlay pointer-events-none" />
            <div className="absolute inset-0 hero-dotgrid opacity-40 pointer-events-none" />
            <div className="relative p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur text-[12px] font-medium text-emerald-50">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-300" />
                    </span>
                    {t("priceTrends.badge")}
                  </div>
                  <h1 className="mt-3 text-3xl lg:text-[40px] font-extrabold tracking-tight leading-[1.05]">
                    {t("priceTrends.title")}
                  </h1>
                  <p className="mt-2 text-emerald-100/80 max-w-lg">{t("priceTrends.subtitle")}</p>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl bg-white/10 ring-1 ring-white/10 backdrop-blur px-4 py-2.5 text-center">
                    <p className="text-lg font-bold tabular-nums"><Ltr>{markets.length || "—"}</Ltr></p>
                    <p className="text-[11px] text-emerald-100/70">{t("priceTrends.kpiCommodities")}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 ring-1 ring-white/10 backdrop-blur px-4 py-2.5 text-center">
                    <p className="text-lg font-bold tabular-nums">12 wk</p>
                    <p className="text-[11px] text-emerald-100/70">{t("priceTrends.kpiForecast")}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 ring-1 ring-white/10 backdrop-blur px-4 py-2.5 text-center">
                    <p className="text-lg font-bold">{t("priceTrends.kpiHourly")}</p>
                    <p className="text-[11px] text-emerald-100/70">{t("priceTrends.kpiUpdated")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main split: watchlist + chart */}
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="lg:w-[340px] flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-3xl dash-card overflow-hidden lg:sticky lg:top-24">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold tracking-tight text-gray-900 dark:text-white">{t("priceTrends.markets")}</h2>
                    {!loading && <span className="text-[11px] font-semibold text-gray-400">{markets.length}</span>}
                  </div>
                  <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-sm text-gray-400">
                    <Search className="w-4 h-4" />
                    {t("priceTrends.searchPlaceholder")}
                  </div>
                </div>
                <div className="max-h-[620px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                  {loading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : markets.length === 0 ? (
                    <p className="p-6 text-center text-sm text-gray-400">{t("priceTrends.noData")}</p>
                  ) : (
                    markets.map((m) => (
                      <MarketRow key={m.commodity} m={m} selected={selected} onSelect={setSelected} />
                    ))
                  )}
                </div>
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <PriceChart
                user={user}
                onLoginRequired={() => navigate("/signin")}
                commodityOverride={selected}
                hideCommodityButtons
              />
            </div>
          </div>

          {/* Market heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl dash-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold tracking-tight text-gray-900 dark:text-white">{t("priceTrends.heatmapTitle")}</h3>
                <p className="text-xs text-gray-400">{t("priceTrends.heatmapSubtitle")}</p>
              </div>
              <span className="hidden sm:block text-xs font-semibold text-gray-400">{t("priceTrends.sortedByChange")}</span>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {sortedByChange.map((m) => {
                  const config = getCommodityConfig(m.commodity);
                  return (
                    <button
                      key={m.commodity}
                      onClick={() => setSelected(m.commodity)}
                      className={`text-left rounded-2xl p-4 ring-1 dash-card-hover transition ${
                        m.up
                          ? "bg-emerald-50/60 dark:bg-emerald-900/15 ring-emerald-100 dark:ring-emerald-800/40"
                          : "bg-rose-50/50 dark:bg-rose-900/15 ring-rose-100 dark:ring-rose-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {config.image ? (
                            <img src={config.image} alt={m.commodity} className="w-7 h-7 object-contain" />
                          ) : (
                            <span className="text-xl">{config.emoji}</span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{m.commodity}</p>
                            <p className="text-[11px] text-gray-400 truncate">{m.city}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold tabular-nums ${m.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          <Ltr>{m.changePct > 0 ? "+" : ""}{m.changePct.toFixed(1)}%</Ltr>
                        </span>
                      </div>
                      <div className="flex items-end justify-between mt-3">
                        <p className="text-lg font-extrabold tabular-nums text-gray-900 dark:text-white">
                          <Ltr>₨{Math.round(m.price).toLocaleString()}</Ltr>
                        </p>
                        <Sparkline points={m.spark} up={m.up} className="w-20 h-8" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PriceTrends;
