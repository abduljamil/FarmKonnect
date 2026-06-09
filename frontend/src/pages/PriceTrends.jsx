import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "../components/Navbar";
import GuestNavbar from "../components/GuestNavbar";
import Footer from "../components/Footer";
import PriceChart from "../components/PriceChart";
import Ltr from "../components/Ltr";
import API_URL from "../config";
import { useLanguage } from "../contexts/LanguageContext";
import { getCommodityConfig, DISPLAY_COMMODITIES } from "../utils/commodities";

// % move below which we render the row as "flat" (neutral gray + em-dash)
// instead of green/red. Rounding-to-zero-percent rows used to render in green
// — same colour as a real gain — which made commodities like Wheat at "0.0%"
// look like they had upward momentum. 0.05% is the same threshold we'd round
// to "0.0%" on screen, so anything tighter is visually indistinguishable.
const FLAT_THRESHOLD = 0.05;

// ── Tiny sparkline (green up / red down / gray flat) ───────────────────────
const Sparkline = ({ points, up, flat, className = "" }) => {
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
  const stroke = flat ? "#9ca3af" : up ? "#059669" : "#e11d48";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

// ── Horizontal market chip — compact card for the top strip ────────────────
// Used in place of the old 340px sticky sidebar. Each chip carries the same
// info (emoji, name, city, price, % change, sparkline) but laid out for a
// horizontally-scrolling row so the chart underneath can fill the viewport.
const MarketChip = ({ m, selected, onSelect }) => {
  const config = getCommodityConfig(m.commodity);
  const isSel = selected === m.commodity;
  const accent = m.isFlat
    ? "text-gray-400 dark:text-gray-500"
    : m.up
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  return (
    <button
      onClick={() => onSelect(m.commodity)}
      className={`flex-shrink-0 w-44 sm:w-48 text-left rounded-2xl p-3 transition-all snap-start ${
        isSel
          ? "ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-md"
          : "ring-1 ring-gray-200 dark:ring-gray-700 bg-white dark:bg-gray-800 hover:ring-primary-300 dark:hover:ring-primary-700 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 grid place-items-center flex-shrink-0 overflow-hidden">
          {config.image ? (
            <img src={config.image} alt={m.commodity} className="w-5 h-5 object-contain" />
          ) : (
            <span className="text-base">{config.emoji}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate text-gray-900 dark:text-white leading-tight">{m.commodity}</p>
          <p className="text-[10px] text-gray-400 truncate leading-tight">{m.city}</p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-extrabold tabular-nums text-gray-900 dark:text-white leading-tight">
            <Ltr>₨{Math.round(m.price).toLocaleString()}</Ltr>
          </p>
          <p className={`text-[11px] font-semibold tabular-nums leading-tight ${accent}`}>
            <Ltr>{m.isFlat ? "—" : `${m.changePct > 0 ? "+" : ""}${m.changePct.toFixed(1)}%`}</Ltr>
          </p>
        </div>
        <Sparkline points={m.spark} up={m.up} flat={m.isFlat} className="w-14 h-7 flex-shrink-0" />
      </div>
    </button>
  );
};

// ── Horizontal market strip with optional scroll arrows ────────────────────
// Encapsulates the loading / empty / list states and adds left/right scroll
// buttons that fade in only when overflow exists. Used at the top of the
// Price Trends page in place of the old sticky sidebar.
const MarketStrip = ({ markets, loading, selected, onSelect, title, emptyText }) => {
  const scrollerRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setHasOverflow(el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [markets.length]);

  const scrollBy = (delta) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl dash-card overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-bold tracking-tight text-gray-900 dark:text-white">{title}</h2>
        <div className="flex items-center gap-2">
          {!loading && <span className="text-[11px] font-semibold text-gray-400">{markets.length}</span>}
          {hasOverflow && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => scrollBy(-280)}
                aria-label="Scroll markets left"
                className="w-7 h-7 grid place-items-center rounded-lg bg-gray-100 dark:bg-gray-700/60 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollBy(280)}
                aria-label="Scroll markets right"
                className="w-7 h-7 grid place-items-center rounded-lg bg-gray-100 dark:bg-gray-700/60 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      >
        {loading ? (
          <div className="flex gap-2 px-4 sm:px-5 py-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-44 sm:w-48 h-[88px] bg-gray-100 dark:bg-gray-700/50 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : markets.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">{emptyText}</p>
        ) : (
          <div className="flex gap-2 px-4 sm:px-5 py-4">
            {markets.map((m) => (
              <MarketChip key={m.commodity} m={m} selected={selected} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
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
              const isFlat = Math.abs(changePct) < FLAT_THRESHOLD;
              return { commodity: p.commodity, city: p.city, price: p.price, unit: p.unit, changePct, isFlat, up: !isFlat && changePct > 0, spark: pts };
            } catch {
              return { commodity: p.commodity, city: p.city, price: p.price, unit: p.unit, changePct: 0, isFlat: true, up: false, spark: [] };
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

          {/* Horizontal markets strip — replaces the old 340px sticky
              sidebar so the chart below can use the full viewport width.
              Scrolls horizontally on overflow; left/right buttons appear
              on desktop. snap-x keeps chips aligned when flicking on touch. */}
          <MarketStrip
            markets={markets}
            loading={loading}
            selected={selected}
            onSelect={setSelected}
            title={t("priceTrends.markets")}
            emptyText={t("priceTrends.noData")}
          />

          {/* Chart card — now full width. Internal chart container in
              PriceChart.jsx scales to ~55vh so the graph dominates the
              visible area without scrolling. */}
          <div>
            <PriceChart
              user={user}
              onLoginRequired={() => navigate("/signin")}
              commodityOverride={selected}
              hideCommodityButtons
            />
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
                        m.isFlat
                          ? "bg-gray-50/70 dark:bg-gray-800/40 ring-gray-200 dark:ring-gray-700"
                          : m.up
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
                        <span className={`text-xs font-bold tabular-nums ${
                          m.isFlat
                            ? "text-gray-400 dark:text-gray-500"
                            : m.up
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                        }`}>
                          <Ltr>
                            {m.isFlat ? "—" : `${m.changePct > 0 ? "+" : ""}${m.changePct.toFixed(1)}%`}
                          </Ltr>
                        </span>
                      </div>
                      <div className="flex items-end justify-between mt-3">
                        <p className="text-lg font-extrabold tabular-nums text-gray-900 dark:text-white">
                          <Ltr>₨{Math.round(m.price).toLocaleString()}</Ltr>
                        </p>
                        <Sparkline points={m.spark} up={m.up} flat={m.isFlat} className="w-20 h-8" />
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
