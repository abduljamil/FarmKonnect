import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import api from '../../services/api';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateInputs = () => {
    if (!email) {
      setError('Please enter your email');
      return false;
    }
    if (!password) {
      setError('Please enter a new password');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/reset-password', {
        email: email.toLowerCase(),
        password,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Your password has been reset successfully!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.replace('SignIn');
            },
          },
        ]);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to reset password';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and new password
            </Text>

            {/* Email Input */}
            <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* New Password Input */}
            <Text style={styles.label}>New Password <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                placeholderTextColor="#6b7280"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm password"
                placeholderTextColor="#6b7280"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            {/* Reset Password Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (loading || !email || !password || !confirmPassword) && styles.buttonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.signInLink}>
              <Text style={styles.signInLinkText}>← Back to SignIn</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1a12',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
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
  logoEmoji: {
    fontSize: 28,
    marginRight: 8,
  },
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
    width: '100%',
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
    lineHeight: 20,
  },

  // Labels
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 8,
    marginTop: 12,
  },
  required: {
    color: '#ef4444',
  },

  // Hint Text
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#0f1a12',
    borderWidth: 1,
    borderColor: '#2d4a35',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#ffffff',
    marginBottom: 4,
  },
  passwordWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  passwordInput: {
    backgroundColor: '#0f1a12',
    borderWidth: 1,
    borderColor: '#2d4a35',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    paddingRight: 40,
    fontSize: 15,
    color: '#ffffff',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 10,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },

  // Error Box
  errorBox: {
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
  },

  // Buttons
  button: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Back Button
  backButton: {
    color: '#86efac',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
  },

  // Sign In Link
  signInLink: {
    marginTop: 8,
  },
  signInLinkText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
});
