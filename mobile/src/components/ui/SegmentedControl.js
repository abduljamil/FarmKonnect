import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

/**
 * Compact segmented control for small, mutually-exclusive option sets
 * (e.g. Orders role, price-trend time range). Cleaner than a row of separate
 * pills: one subtle track with the selected segment filled.
 *
 * Props:
 *   options:  [{ label, value }]
 *   value:    currently-selected value
 *   onChange: (value) => void
 *   scroll:   when true, lay segments out at natural width in a horizontal
 *             scroll (use when there are many segments); otherwise they split
 *             the row equally.
 */
export default function SegmentedControl({ options, value, onChange, style }) {
  return (
    <View style={[styles.track, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
            activeOpacity={0.8}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  labelActive: { color: COLORS.white },
});
