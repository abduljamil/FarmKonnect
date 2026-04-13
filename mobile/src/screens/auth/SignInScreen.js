import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  Alert, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useContext(AuthContext);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      console.log('RESULT:', JSON.stringify(result));
      if (!result.success) {
        if (result.requiresVerification) {
          Alert.alert(
            'Email Not Verified',
            'Please verify your email before signing in.',
            [{ text: 'OK' }]
          );
        } else {
          let msg = result.message || 'Sign in failed'; if (msg.includes('Illegal') || msg.includes('undefined')) { msg = 'Invalid credentials or no password associated with this account (social login).'; } setError(msg); Alert.alert('Sign In Failed', msg);
        }
      }
    } catch (err) {
      console.log('ERROR:', err.message);
      setError('Network error. Please check your connection.');
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
            <Text style={styles.title}>Welcome to FarmKonnect</Text>
            <Text style={styles.subtitle}>Sign in to your FarmKonnect account</Text>

            {/* Google Button */}
            <TouchableOpacity style={styles.googleBtn}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            {/* Password */}
            <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
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
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={styles.signInBtnText}>Sign In</Text>
              }
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerLink}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom badges */}
          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ No Commission</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ Verified Users</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✓ Secure Pay</Text>
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
