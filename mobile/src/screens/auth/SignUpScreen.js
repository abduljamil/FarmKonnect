import React, { useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, StyleSheet, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';
import { Mail, Lock, User, Phone } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const SignUpScreen = ({ navigation }) => {
  const { signUp } = useContext(AuthContext);
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = t('errors.requiredField');
    if (!email.trim()) newErrors.email = t('errors.requiredField');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim() && !emailRegex.test(email)) newErrors.email = t('errors.invalidEmail');
    if (!password) newErrors.password = t('errors.requiredField');
    else if (password.length < 6) newErrors.password = t('errors.weakPassword');
    if (password !== confirmPassword) newErrors.confirmPassword = t('errors.passwordMismatch');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await signUp(name.trim(), email.trim().toLowerCase(), password);
    setLoading(false);

    if (result.success) {
      // Web flow redirects to /email-sent after signup so users know to check
      // their inbox. On mobile we drop them on SignIn with a clear instruction
      // and replace() so back button doesn't return them to the half-filled
      // signup form.
      Alert.alert(
        t('auth.verifyEmail.title'),
        t('auth.verifyEmail.subtitle'),
        [{ text: t('common.ok'), onPress: () => navigation.replace('SignIn') }]
      );
    } else {
      Alert.alert(t('common.error'), result.message || t('errors.somethingWrong'));
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <AnimatedBlobs />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoBox}>
                  <Text style={styles.logoEmoji}>🌾</Text>
                </View>
                <Text style={styles.title}>{t('auth.signUp.title')}</Text>
                <Text style={styles.subtitle}>{t('auth.signUp.subtitle')}</Text>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
                <Input
                  label={t('auth.signUp.name')}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('auth.signUp.name')}
                  error={errors.name}
                  leftIcon={<User color="#a3a3a3" size={18} />}
                />
                <Input
                  label={t('auth.signUp.email')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.signUp.email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                  leftIcon={<Mail color="#a3a3a3" size={18} />}
                />
                <Input
                  label={`${t('auth.signUp.phone')} (${t('common.optional')})`}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="03XX-XXXXXXX"
                  keyboardType="phone-pad"
                  leftIcon={<Phone color="#a3a3a3" size={18} />}
                />
                <Input
                  label={t('auth.signUp.password')}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('errors.weakPassword')}
                  secureTextEntry
                  error={errors.password}
                  leftIcon={<Lock color="#a3a3a3" size={18} />}
                />
                <Input
                  label={t('auth.signUp.confirmPassword')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('auth.signUp.confirmPassword')}
                  secureTextEntry
                  error={errors.confirmPassword}
                  leftIcon={<Lock color="#a3a3a3" size={18} />}
                />

                <Button
                  title={t('auth.signUp.button')}
                  onPress={handleSignUp}
                  loading={loading}
                />
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('auth.signUp.haveAccount')} </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                  <Text style={styles.signInLink}>{t('auth.signUp.signInLink')}</Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1a12',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(26, 46, 31, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#a3a3a3',
    fontSize: 14,
  },
  signInLink: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignUpScreen;
