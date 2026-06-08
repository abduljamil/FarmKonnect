import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react-native';
import api from '../../services/api';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

// Mirrors web's frontend/src/pages/ResetPassword.jsx — takes a `token`
// route param (passed by deep-link handler in App.js when the user taps
// the reset link in their email), submits the new password to
// POST /api/auth/reset-password/:token.
export default function ResetPasswordScreen({ navigation, route }) {
  const { t } = useTranslation();
  const token = route?.params?.token;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      setError('Missing reset token. Please request a new reset email.');
      return;
    }
    if (!password) {
      setError(t('errors.requiredField'));
      return;
    }
    if (password.length < 6) {
      setError(t('errors.weakPassword'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, { password });
      if (res.data?.success) {
        setSuccess(true);
      } else {
        setError(res.data?.message || t('errors.somethingWrong'));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
        <AnimatedBlobs />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle color="#16a34a" size={48} />
          </View>
          <Text style={styles.title}>Password updated</Text>
          <Text style={styles.subtitle}>
            Your password has been reset successfully. You can now sign in with your new password.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('SignIn')}>
            <Text style={styles.primaryBtnText}>{t('auth.signIn.button')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <AnimatedBlobs />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
            <ArrowLeft color="#a3a3a3" size={20} />
            <Text style={styles.backLink}>{t('common.back')}</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Lock color="#16a34a" size={40} />
          </View>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>Choose a new password (minimum 6 characters).</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            placeholder={t('errors.weakPassword')}
            placeholderTextColor="#6b7280"
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
            placeholder={t('auth.signUp.confirmPassword')}
            placeholderTextColor="#6b7280"
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Update password</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  container: { padding: 24, paddingTop: 60, flexGrow: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backLink: { color: '#a3a3a3', fontSize: 14, fontWeight: '500' },
  iconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(22, 163, 74, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.3)' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { color: '#a3a3a3', fontSize: 14, marginBottom: 24, lineHeight: 20 },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#ef4444', fontSize: 13 },
  label: { color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { backgroundColor: 'rgba(26, 46, 31, 0.8)', borderWidth: 1, borderColor: '#224026', borderRadius: 12, color: '#fff', padding: 14, fontSize: 16, marginBottom: 16 },
  primaryBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(22, 163, 74, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
});
