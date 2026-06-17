import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { MailCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';
import { COLORS } from '../../constants/colors';

// Shown after signup (mirrors web's EmailSent page) instead of a one-off Alert.
// Tells the user to check their inbox and lets them resend the verification
// email. `email` comes through navigation params from SignUpScreen.
export default function EmailSentScreen({ navigation, route }) {
  const { t } = useTranslation();
  const email = route?.params?.email || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError('');
    try {
      await api.post('/auth/resend-verification', { email });
      setResent(true);
    } catch (err) {
      setError(err.response?.data?.message || t('errors.somethingWrong'));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <AnimatedBlobs />
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <MailCheck color={COLORS.primary} size={48} />
        </View>
        <Text style={styles.title}>{t('auth.verifyEmail.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.verifyEmail.subtitle')}</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}

        {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={resending || resent}
        >
          {resending
            ? <ActivityIndicator color={COLORS.primary} />
            : <Text style={styles.resendText}>{resent ? `✓ ${t('common.success')}` : t('auth.verifyEmail.resend')}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('SignIn')}>
          <Text style={styles.primaryBtnText}>{t('auth.signIn.button')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 8 },
  email: { color: COLORS.primaryLight, fontSize: 15, fontWeight: '600', marginBottom: 24 },
  error: { color: COLORS.danger, fontSize: 13, marginBottom: 16, textAlign: 'center' },
  resendBtn: { paddingVertical: 12, paddingHorizontal: 24, marginBottom: 12 },
  resendText: { color: COLORS.primaryLight, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
