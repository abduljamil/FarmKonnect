import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { CheckCircle, XCircle, Mail } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';
import { COLORS } from '../../constants/colors';

// In-app email verification. The verification email links to
// https://www.farmkonnect.app/verify-email/<token>, which app.json's Android
// intent filter routes here. Hits GET /api/auth/verify-email/:token and shows
// the result, instead of (previously) punting the user out to the browser.
export default function VerifyEmailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const token = route?.params?.token;
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token. Please use the link from your email.');
        return;
      }
      try {
        const res = await api.get(`/auth/verify-email/${encodeURIComponent(token)}`);
        if (cancelled) return;
        if (res.data?.success !== false) {
          setStatus('success');
          setMessage(res.data?.message || 'Your email has been verified. You can now sign in.');
        } else {
          setStatus('error');
          setMessage(res.data?.message || 'Verification failed.');
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err.response?.data?.message || 'This verification link is invalid or has expired.');
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <AnimatedBlobs />
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          {status === 'verifying' && <Mail color={COLORS.primary} size={48} />}
          {status === 'success' && <CheckCircle color={COLORS.primary} size={48} />}
          {status === 'error' && <XCircle color={COLORS.danger} size={48} />}
        </View>

        {status === 'verifying' ? (
          <>
            <Text style={styles.title}>Verifying your email…</Text>
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
          </>
        ) : (
          <>
            <Text style={styles.title}>
              {status === 'success' ? 'Email verified' : 'Verification failed'}
            </Text>
            <Text style={styles.subtitle}>{message}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('SignIn')}>
              <Text style={styles.primaryBtnText}>{t('auth.signIn.button')}</Text>
            </TouchableOpacity>
          </>
        )}
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
  subtitle: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 28 },
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12 },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});
