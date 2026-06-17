import { COLORS } from '../../constants/colors';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';
import api from '../../services/api';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

// Mobile forgot-password flow — mirrors the web version (frontend/src/pages/
// ForgotPassword.jsx). The user submits their email, the backend sends a
// reset link to that email, and the user resets via the web URL embedded in
// the email. The PREVIOUS implementation POSTed `{email, password}` to a
// non-existent `/auth/reset-password` endpoint, which silently 404'd AND, if
// it had succeeded, would have let anyone reset anyone's password without
// email verification. That has been removed.

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError(t('errors.requiredField'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('errors.invalidEmail'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      if (res.data?.success) {
        setSuccess(true);
      } else {
        setError(res.data?.message || t('errors.somethingWrong'));
      }
    } catch (err) {
      // The backend deliberately returns success even for unknown emails
      // (account-enumeration defense). A real failure here is a network/500.
      setError(err.response?.data?.message || t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <AnimatedBlobs />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle color={COLORS.primary} size={48} />
          </View>
          <Text style={styles.title}>{t('auth.verifyEmail.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.forgotPassword.subtitle')}
          </Text>
          <Text style={styles.emailDisplay}>{email}</Text>
          <TouchableOpacity style={styles.backToSignInBtn} onPress={() => navigation.replace('SignIn')}>
            <ArrowLeft color={COLORS.white} size={16} />
            <Text style={styles.backToSignInText}>{t('auth.forgotPassword.backToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <AnimatedBlobs />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
            <ArrowLeft color={COLORS.textMuted} size={20} />
            <Text style={styles.backLink}>{t('common.back')}</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Mail color={COLORS.primary} size={40} />
          </View>

          <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgotPassword.subtitle')}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>{t('auth.signIn.email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            placeholder={t('auth.signIn.email')}
            placeholderTextColor={COLORS.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.submitBtnText}>{t('auth.forgotPassword.button')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.signInRow} onPress={() => navigation.replace('SignIn')}>
            <Text style={styles.signInRowText}>{t('auth.forgotPassword.backToLogin')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 24, paddingTop: 60, flexGrow: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backLink: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  iconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(22, 163, 74, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.3)' },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.white, marginBottom: 8 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 24, lineHeight: 20 },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: COLORS.danger, fontSize: 13 },
  label: { color: COLORS.white, fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { backgroundColor: 'rgba(26, 46, 31, 0.8)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, color: COLORS.white, padding: 14, fontSize: 16, marginBottom: 20 },
  submitBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  signInRow: { marginTop: 20, alignItems: 'center' },
  signInRowText: { color: COLORS.primary, fontSize: 14, fontWeight: '500' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(22, 163, 74, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emailDisplay: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginVertical: 12 },
  backToSignInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22, 163, 74, 0.15)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 24, gap: 8 },
  backToSignInText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
});
