import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

// Dark-theme button matching the rest of the app's StyleSheet screens.
// (Previously this used NativeWind `className` with a light palette, which
// neither matched the dark screens nor rendered at all on the current RN/React
// toolchain.)
const Button = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  icon = null,
}) => {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;
  const spinnerColor = variant === 'outline' || variant === 'ghost' ? COLORS.primary : COLORS.white;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        v.btn,
        s.btn,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, v.text, s.text]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const VARIANTS = {
  primary: { btn: { backgroundColor: COLORS.primary }, text: { color: COLORS.white } },
  outline: { btn: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: 'transparent' }, text: { color: COLORS.primary } },
  danger:  { btn: { backgroundColor: COLORS.danger }, text: { color: COLORS.white } },
  ghost:   { btn: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border }, text: { color: COLORS.text } },
};

const SIZES = {
  sm: { btn: { paddingHorizontal: 16, paddingVertical: 10 }, text: { fontSize: 14 } },
  md: { btn: { paddingHorizontal: 24, paddingVertical: 16 }, text: { fontSize: 16 } },
  lg: { btn: { paddingHorizontal: 32, paddingVertical: 18 }, text: { fontSize: 18 } },
};

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontWeight: 'bold' },
});

export default Button;
