import { COLORS } from '../../constants/colors';
import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  Alert, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { AuthContext } from '../../contexts/AuthContext';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';
import api from '../../services/api';

// Google client IDs are read from Expo's `extra` config (or a fallback
// env-injected at build time). Set these in app.json `extra` or via
// EAS secrets — they're public per Google's OAuth spec but must match
// the audience the backend whitelists in /api/auth/google.
const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Initialize the native Google Sign-In engine.
// This perfectly reads the Android Client ID natively from the injected google-services.json
// and uses the Web Client ID to securely request an idToken for the backend.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true, // Forces a refresh token and idToken
});

// The GoogleButton now triggers the blazing-fast native Android Play Services modal
// instead of a clunky in-app web browser that Google explicitly blocks.
function GoogleButton({ t, onError }) {
  const { signInWithGoogle } = useContext(AuthContext);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handlePress = async () => {
    onError('');
    setGoogleLoading(true);
    try {
      // Ensure Google Play Services are available before launching the UI
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Triggers the native Android bottom-sheet account selector!
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken || userInfo.data?.idToken; // handle different library versions
      
      if (idToken) {
        const r = await signInWithGoogle(idToken);
        if (!r.success) {
          onError(r.message || t('errors.somethingWrong'));
        }
      } else {
        onError('No ID token returned from Google');
      }
    } catch (error) {
      console.log('Google Auth Error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        onError('Google sign-in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // already in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError('Google Play Services not available or outdated');
      } else {
        onError(error.message || t('errors.somethingWrong'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
      onPress={handlePress}
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
  );
}

// Shown when no Google client IDs are configured — explains the setup step
// instead of opening a broken consent screen or crashing.
function GoogleButtonUnconfigured({ t }) {
  return (
    <TouchableOpacity
      style={styles.googleBtn}
      onPress={() => Alert.alert(
        'Not configured',
        'Google sign-in is not set up yet. Ask the developer to add EXPO_PUBLIC_GOOGLE_* client IDs.'
      )}
    >
      <Text style={styles.googleIcon}>G</Text>
      <Text style={styles.googleText}>{t('auth.signIn.google')}</Text>
    </TouchableOpacity>
  );
}

export default function SignInScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { signIn } = useContext(AuthContext);

  // Google client IDs are optional. expo-auth-session's Google provider throws
  // synchronously ("iosClientId must be defined") on iOS if its hook runs with
  // undefined IDs, so the hook lives in <GoogleButton> below, which is only
  // mounted when at least one client ID is configured. When it isn't, we render
  // a button that explains the setup step instead of crashing the screen.
  const googleConfigured = !!(GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);

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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

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

            {/* Google Button — the auth hook only mounts when configured */}
            {googleConfigured
              ? <GoogleButton t={t} onError={setError} />
              : <GoogleButtonUnconfigured t={t} />}

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
              placeholderTextColor={COLORS.textFaint}
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
                placeholderTextColor={COLORS.textFaint}
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
    backgroundColor: COLORS.bg, alignItems: 'center',
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
    backgroundColor: COLORS.primary,
    opacity: 0.15,
  },
  blobRight: {
    position: 'absolute',
    right: -60,
    top: '50%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accent,
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
    color: COLORS.primaryLight,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2d4a35',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray400,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 10,
  },
  googleText: {
    color: COLORS.white,
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
    color: COLORS.textFaint,
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
  verifyTitle: { color: COLORS.warning, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  verifyDesc:  { color: '#fde68a', fontSize: 12, lineHeight: 18 },
  verifyLink:  { color: COLORS.warning, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray300,
    marginBottom: 8,
  },
  required: { color: COLORS.danger },

  // Input
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.white,
    marginBottom: 16,
  },

  // Password
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.white,
  },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 18 },

  // Forgot
  forgotRow: { alignItems: 'flex-end', marginBottom: 20 },
  forgotText: { color: COLORS.primaryLight, fontSize: 13, fontWeight: '600' },

  // Sign In Button
  signInBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnDisabled: { backgroundColor: COLORS.inputBorder },
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
  footerText: { color: COLORS.gray400, fontSize: 14 },
  footerLink: { color: COLORS.primaryLight, fontWeight: 'bold', fontSize: 14 },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  badge: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2d4a35',
  },
  badgeText: { color: COLORS.primaryLight, fontSize: 11, fontWeight: '600' },
});
