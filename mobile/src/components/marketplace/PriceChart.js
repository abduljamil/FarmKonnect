import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import Svg, {
  Path, Line, Circle, Rect, Defs, LinearGradient, Stop, Text as SvgText, G,
} from 'react-native-svg';
import { COLORS } from '../../constants/colors';

// Heavy interactive price chart. Replaces the old bare line+polyline.
// Features: Y-axis gridlines + price labels, X-axis date labels, gradient
// area fill for history, a dashed forecast tail with a shaded confidence
// band, min/max + latest markers, and a draggable crosshair tooltip
// (PanResponder) that snaps to the nearest data point.
//
// Props:
//   history:  [{ date, price }]
//   forecast: [{ predicted_price, horizon_weeks, anchor_date, lower?, upper? }]
const CHART_HEIGHT = 220;
const PAD_LEFT = 46;   // room for Y labels
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;  // room for X labels

const fmtPrice = (v) => {
  if (v >= 1000) return `${Math.round(v / 100) / 10}k`;
  return `${Math.round(v)}`;
};
const fmtDate = (d) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function PriceChart({ history = [], forecast = [], width }) {
  const screenW = Dimensions.get('window').width;
  const W = width || screenW - 40;
  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const [active, setActive] = useState(null); // index into combined points

  // Build the combined, normalised point list once per data change.
  const model = useMemo(() => {
    const hist = (history || [])
      .map((d) => ({ price: Number(d.price), label: fmtDate(d.date), kind: 'hist' }))
      .filter((p) => !isNaN(p.price) && p.price > 0);

    const anchor = forecast?.[0]?.anchor_date;
    const fc = (forecast || [])
      .slice()
      .sort((a, b) => (a.horizon_weeks || 0) - (b.horizon_weeks || 0))
      .map((d) => {
        const price = Number(d.predicted_price);
        const lower = Number(d.lower ?? d.lower_bound ?? price * 0.94);
        const upper = Number(d.upper ?? d.upper_bound ?? price * 1.06);
        return {
          price,
          lower: isNaN(lower) ? price : lower,
          upper: isNaN(upper) ? price : upper,
          label: `+${d.horizon_weeks || '?'}w`,
          kind: 'fc',
        };
      })
      .filter((p) => !isNaN(p.price));

    const combined = [...hist, ...fc];
    if (combined.length < 2) return null;

    const allVals = [
      ...hist.map((p) => p.price),
      ...fc.flatMap((p) => [p.price, p.lower, p.upper]),
    ];
    let min = Math.min(...allVals);
    let max = Math.max(...allVals);
    if (min === max) { min -= 1; max += 1; }
    // Pad the range 6% top/bottom so the line isn't flush against the edges.
    const span = max - min;
    min -= span * 0.06;
    max += span * 0.06;
    const range = max - min || 1;

    const n = combined.length;
    const stepX = plotW / (n - 1);
    const xAt = (i) => PAD_LEFT + i * stepX;
    const yAt = (v) => PAD_TOP + (1 - (v - min) / range) * plotH;

    combined.forEach((p, i) => { p.x = xAt(i); p.y = yAt(p.price); });

    const histPts = combined.filter((p) => p.kind === 'hist');
    const fcPts = combined.filter((p) => p.kind === 'fc');
    const histLine = histPts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const lastHist = histPts[histPts.length - 1];

    // Forecast line anchors on the last history point so they connect.
    const fcLine = fcPts.length
      ? `M${lastHist.x.toFixed(1)},${lastHist.y.toFixed(1)} ` +
        fcPts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      : '';

    // Confidence band polygon (upper edge forward, lower edge back).
    let band = '';
    if (fcPts.length) {
      const up = [`M${lastHist.x.toFixed(1)},${lastHist.y.toFixed(1)}`,
        ...fcPts.map((p) => `L${p.x.toFixed(1)},${yAt(p.upper).toFixed(1)}`)];
      const down = [...fcPts.slice().reverse().map((p) => `L${p.x.toFixed(1)},${yAt(p.lower).toFixed(1)}`),
        `L${lastHist.x.toFixed(1)},${lastHist.y.toFixed(1)}`];
      band = [...up, ...down, 'Z'].join(' ');
    }

    const area = `${histLine} L${lastHist.x.toFixed(1)},${(PAD_TOP + plotH).toFixed(1)} L${PAD_LEFT.toFixed(1)},${(PAD_TOP + plotH).toFixed(1)} Z`;

    // Min / max history markers.
    const hi = histPts.reduce((a, p) => (p.price > a.price ? p : a), histPts[0]);
    const lo = histPts.reduce((a, p) => (p.price < a.price ? p : a), histPts[0]);

    // Y gridline ticks (4 bands).
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const v = max - f * range;
      return { y: PAD_TOP + f * plotH, v };
    });

    return { combined, histPts, fcPts, histLine, fcLine, band, area, lastHist, hi, lo, ticks, min, max, range, stepX };
  }, [history, forecast, plotW, plotH]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => updateActive(e.nativeEvent.locationX),
      onPanResponderMove: (e) => updateActive(e.nativeEvent.locationX),
      onPanResponderRelease: () => setActive(null),
      onPanResponderTerminate: () => setActive(null),
    })
  ).current;

  const modelRef = useRef(model);
  modelRef.current = model;
  const updateActive = (locX) => {
    const m = modelRef.current;
    if (!m) return;
    const i = Math.round((locX - PAD_LEFT) / m.stepX);
    setActive(Math.max(0, Math.min(m.combined.length - 1, i)));
  };

  if (!model) {
    return (
      <View style={[styles.empty, { width: W, height: CHART_HEIGHT }]}>
        <Text style={styles.emptyText}>Not enough data to chart</Text>
      </View>
    );
  }

  const sel = active != null ? model.combined[active] : null;

  return (
    <View style={{ width: W }}>
      <View {...pan.panHandlers}>
        <Svg width={W} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="histFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.28" />
              <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Y gridlines + labels */}
          {model.ticks.map((t, i) => (
            <G key={`g${i}`}>
              <Line x1={PAD_LEFT} y1={t.y} x2={W - PAD_RIGHT} y2={t.y} stroke={COLORS.border} strokeWidth="1" strokeDasharray="3,5" />
              <SvgText x={PAD_LEFT - 8} y={t.y + 3} fontSize="9" fill={COLORS.textFaint} textAnchor="end">
                {fmtPrice(t.v)}
              </SvgText>
            </G>
          ))}

          {/* Forecast confidence band */}
          {model.band ? <Path d={model.band} fill="#f97316" fillOpacity="0.12" /> : null}

          {/* History area + line */}
          <Path d={model.area} fill="url(#histFill)" />
          <Path d={model.histLine} fill="none" stroke={COLORS.primary} strokeWidth="2.5" strokeLinejoin="round" />

          {/* Forecast dashed line */}
          {model.fcLine ? (
            <Path d={model.fcLine} fill="none" stroke="#f97316" strokeWidth="2.5" strokeDasharray="6,4" strokeLinejoin="round" />
          ) : null}

          {/* min / max / latest markers */}
          <Circle cx={model.hi.x} cy={model.hi.y} r="3.5" fill={COLORS.primaryLight} />
          <Circle cx={model.lo.x} cy={model.lo.y} r="3.5" fill={COLORS.danger} />
          <Circle cx={model.lastHist.x} cy={model.lastHist.y} r="4" fill={COLORS.white} stroke={COLORS.primary} strokeWidth="2" />
          {model.fcPts.map((p, i) => (
            <Circle key={`fc${i}`} cx={p.x} cy={p.y} r="3" fill="#f97316" />
          ))}

          {/* X labels: first, middle, last + forecast end */}
          {[
            model.histPts[0], 
            model.histPts[Math.floor(model.histPts.length / 2)], 
            model.fcPts.length ? null : model.histPts[model.histPts.length - 1]
          ]
            .filter(Boolean)
            .map((p, i) => (
              <SvgText key={`x${i}`} x={p.x} y={CHART_HEIGHT - 8} fontSize="9" fill={COLORS.textFaint} textAnchor="middle">
                {p.label}
              </SvgText>
            ))}
          {model.fcPts.length ? (
            <SvgText x={model.fcPts[model.fcPts.length - 1].x} y={CHART_HEIGHT - 8} fontSize="9" fill="#f97316" textAnchor="end">
              {model.fcPts[model.fcPts.length - 1].label}
            </SvgText>
          ) : null}

          {/* Crosshair for the active (touched) point */}
          {sel ? (
            <G>
              <Line x1={sel.x} y1={PAD_TOP} x2={sel.x} y2={PAD_TOP + plotH} stroke={COLORS.textMuted} strokeWidth="1" strokeDasharray="2,3" />
              <Circle cx={sel.x} cy={sel.y} r="5" fill={sel.kind === 'fc' ? '#f97316' : COLORS.primary} stroke={COLORS.white} strokeWidth="2" />
            </G>
          ) : null}
        </Svg>
      </View>

      {/* Tooltip bubble (outside SVG so text wrapping is easy) */}
      {sel ? (
        <View
          style={[
            styles.tooltip,
            { left: Math.max(0, Math.min(W - 120, sel.x - 60)) },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.tooltipLabel}>{sel.kind === 'fc' ? `Forecast ${sel.label}` : sel.label}</Text>
          <Text style={styles.tooltipPrice}>₨ {Math.round(sel.price).toLocaleString()}</Text>
        </View>
      ) : null}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>History</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: '#f97316' }]} />
          <Text style={styles.legendText}>Forecast</Text>
        </View>
        <Text style={styles.legendHint}>Drag on the chart for details</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },
  tooltip: {
    position: 'absolute',
    top: 0,
    width: 120,
    backgroundColor: COLORS.bgDeep,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  tooltipLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 2 },
  tooltipPrice: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 4, borderRadius: 2 },
  legendText: { color: COLORS.textMuted, fontSize: 11 },
  legendHint: { color: COLORS.textFaint, fontSize: 10, marginLeft: 'auto', fontStyle: 'italic' },
});
