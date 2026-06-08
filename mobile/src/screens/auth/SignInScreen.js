import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  Alert, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from '../../contexts/AuthContext';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';
import api from '../../services/api';

// expo-auth-session needs this on first import so it can dismiss the
// in-app browser once Google returns to our redirect URI.
WebBrowser.maybeCompleteAuthSession();

// Google client IDs are read from Expo's `extra` config (or a fallback
// env-injected at build time). Set these in app.json `extra` or via
// EAS secrets — they're public per Google's OAuth spec but must match
// the audience the backend whitelists in /api/auth/google.
const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default function SignInScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { signIn, signInWithGoogle } = useContext(AuthContext);

  // expo-auth-session Google provider — returns an `idToken` we POST to the
  // backend's /api/auth/google. If the client IDs aren't configured we
  // short-circuit so the Continue with Google button explains why instead
  // of opening a broken consent screen.
  const googleConfigured = !!(GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId:     GOOGLE_WEB_CLIENT_ID,
  });

  // When Google returns, hand the id_token to AuthContext.signInWithGoogle.
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
      if (idToken) {
        setGoogleLoading(true);
        signInWithGoogle(idToken)
          .then((r) => {
            if (!r.success) {
              setError(r.message || t('errors.somethingWrong'));
            }
          })
          .finally(() => setGoogleLoading(false));
      }
    } else if (googleResponse?.type === 'error') {
      setError(googleResponse?.error?.message || 'Google sign-in cancelled');
      setGoogleLoading(false);
    }
  }, [googleResponse]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleSignIn = async () => {
    if (!googleConfigured) {
      Alert.alert(
        'Not configured',
        'Google sign-in is not set up yet. Ask the developer to add EXPO_PUBLIC_GOOGLE_* client IDs.'
      );
      return;
    }
    if (!googleRequest) return; // request still initializing
    setError('');
    setGoogleLoading(true);
    try {
      // promptAsync opens the in-app browser → Google consent → returns
      // params.id_token. The useEffect above picks the result up.
      await promptGoogle();
    } catch (err) {
      setError(err.message || t('errors.somethingWrong'));
      setGoogleLoading(false);
    }
  };

  // Add useEffect import safety guard — we already used it
  // unconditionally; just import below.

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: unverifiedEmail });
      setResendSuccess(true);
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('errors.somethingWrong'));
    } finally {
      setResending(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError(t('errors.requiredField'));
      return;
    }
    setLoading(true);
    setError('');
    setRequiresVerification(false);
    setResendSuccess(false);
    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      if (!result.success) {
        if (result.requiresVerification) {
          // Surface the verification banner with a "Resend" button (was just
          // an Alert before — no way to trigger a fresh email from the app).
          setUnverifiedEmail(result.email || email.trim().toLowerCase());
          setRequiresVerification(true);
        } else {
          let msg = result.message || t('errors.somethingWrong');
          if (msg.includes('social login')) {
            msg = t('auth.signIn.google'); // best-effort hint to use Google
          } else if (msg.includes('Illegal') || msg.includes('undefined')) {
            msg = t('errors.invalidCredentials');
          }
          setError(msg);
          Alert.alert(t('common.error'), msg);
        }
      }
    } catch {
      setError(t('errors.networkError'));
    }
    setLoading(false);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />

      {/* Animated Background */}
      <AnimatedBlobs />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <Text style={styles.logoEmoji}>🌾</Text>
            <Text style={styles.logoText}>FarmKonnect</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>{t('auth.signIn.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.signIn.subtitle')}</Text>

            {/* Google Button */}
            <TouchableOpacity
              style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>{t('auth.signIn.google')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.signIn.orContinueWith')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Verification banner — shown after a 401 with requiresVerification */}
            {requiresVerification && (
              <View style={styles.verifyBox}>
                <Text style={styles.verifyTitle}>📧 {t('auth.verifyEmail.title')}</Text>
                <Text style={styles.verifyDesc}>{t('auth.verifyEmail.subtitle')}</Text>
                <TouchableOpacity
                  onPress={handleResendVerification}
                  disabled={resending || resendSuccess}
                  style={{ marginTop: 8 }}
                >
                  <Text style={styles.verifyLink}>
                    {resending ? '...' : resendSuccess ? `✓ ${t('common.success')}` : t('auth.verifyEmail.resend')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <Text style={styles.label}>{t('auth.signIn.email')} <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.signIn.email')}
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            {/* Password */}
            <Text style={styles.label}>{t('auth.signIn.password')} <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t('auth.signIn.password')}
                placeholderTextColor="#6b7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Forgot */}
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>{t('auth.signIn.forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.signInBtnText}>{t('auth.signIn.button')}</Text>
              }
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{t('auth.signIn.noAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerLink}>{t('nav.getStarted')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom badges */}
          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ {t('landing.hero.noCommission')}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ {t('landing.hero.verifiedUsers')}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ {t('landing.hero.securePayments')}</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1a12', alignItems: 'center',
  },
  flex: { flex: 1 },

  // Ombre blobs on sides
  blobLeft: {
    position: 'absolute',
    left: -60,
    top: '20%',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#16a34a',
    opacity: 0.15,
  },
  blobRight: {
    position: 'absolute',
    right: -60,
    top: '50%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#10b981',
    opacity: 0.12,
  },

  container: {
    flexGrow: 1, 
    alignItems: 'center',
    paddingHorizontal: 24, width: "100%", maxWidth: 450, alignSelf: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Logo
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoEmoji: { fontSize: 28, marginRight: 8 },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ade80',
  },

  // Card
  card: {
    backgroundColor: '#1a2e1f',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2d4a35',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#263a2c',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 10,
  },
  googleText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2d4a35',
  },
  dividerText: {
    color: '#6b7280',
    fontSize: 12,
    marginHorizontal: 10,
  },

  // Error
  errorBox: {
    backgroundColor: '#3b1a1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  errorText: { color: '#f87171', fontSize: 13 },

  // Verify banner
  verifyBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  verifyTitle: { color: '#fbbf24', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  verifyDesc:  { color: '#fde68a', fontSize: 12, lineHeight: 18 },
  verifyLink:  { color: '#fbbf24', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 8,
  },
  required: { color: '#ef4444' },

  // Input
  input: {
    backgroundColor: '#263a2c',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#ffffff',
    marginBottom: 16,
  },

  // Password
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#263a2c',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#ffffff',
  },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 18 },

  // Forgot
  forgotRow: { alignItems: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#4ade80', fontSize: 13, fontWeight: '600' },

  // Sign In Button
  signInBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnDisabled: { backgroundColor: '#374151' },
  signInBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: { color: '#9ca3af', fontSize: 14 },
  footerLink: { color: '#4ade80', fontWeight: 'bold', fontSize: 14 },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  badge: {
    backgroundColor: '#1a2e1f',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2d4a35',
  },
  badgeText: { color: '#4ade80', fontSize: 11, fontWeight: '600' },
});
