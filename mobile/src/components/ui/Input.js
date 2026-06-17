import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';

// Dark-theme input matching the app's StyleSheet screens. Replaces the old
// NativeWind (light, white-on-dark) version. Now forwards `autoCapitalize`
// (the email field on SignUp relied on it but it was silently dropped before).
const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  error = '',
  multiline = false,
  numberOfLines = 1,
  leftIcon = null,
  editable = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[
        styles.inputRow,
        error ? styles.inputRowError : null,
        !editable && styles.disabled,
        multiline && styles.inputRowMultiline,
      ]}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          style={[styles.input, multiline && styles.inputMultiline]}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword((p) => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {showPassword
              ? <EyeOff color={COLORS.textMuted} size={20} />
              : <Eye color={COLORS.textMuted} size={20} />}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { color: COLORS.gray300, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputRowMultiline: { alignItems: 'flex-start' },
  inputRowError: { borderColor: COLORS.danger },
  disabled: { opacity: 0.6 },
  leftIcon: { marginRight: 10 },
  input: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 14 },
  inputMultiline: { minHeight: 100, paddingTop: 14 },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 6, marginLeft: 4 },
});

export default Input;
