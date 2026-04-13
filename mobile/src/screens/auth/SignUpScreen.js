import React, { useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Mail, Lock, User, Phone } from 'lucide-react-native';

const SignUpScreen = ({ navigation }) => {
  const { signUp } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await signUp(name.trim(), email.trim().toLowerCase(), password);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Account Created! 🎉',
        'Please check your email to verify your account.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Sign Up Failed', result.message || 'Something went wrong');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-12 pb-8">

            {/* Header */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-green-600 rounded-3xl items-center justify-center mb-4">
                <Text className="text-4xl">🌾</Text>
              </View>
              <Text className="text-3xl font-bold text-gray-900">Create Account</Text>
              <Text className="text-gray-500 mt-2 text-center">
                Join FarmKonnect today
              </Text>
            </View>

            {/* Form */}
            <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                error={errors.name}
                leftIcon={<User color="#9ca3af" size={18} />}
              />
              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                error={errors.email}
                leftIcon={<Mail color="#9ca3af" size={18} />}
              />
              <Input
                label="Phone (Optional)"
                value={phone}
                onChangeText={setPhone}
                placeholder="03XX-XXXXXXX"
                keyboardType="phone-pad"
                leftIcon={<Phone color="#9ca3af" size={18} />}
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 6 characters"
                secureTextEntry
                error={errors.password}
                leftIcon={<Lock color="#9ca3af" size={18} />}
              />
              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                secureTextEntry
                error={errors.confirmPassword}
                leftIcon={<Lock color="#9ca3af" size={18} />}
              />

              <Button
                title="Create Account"
                onPress={handleSignUp}
                loading={loading}
              />
            </View>

            {/* Footer */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-500">Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text className="text-green-600 font-bold">Sign In</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUpScreen;
