import { COLORS } from '../../constants/colors';
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { getProfile, updateProfile, uploadAvatar } from '../../services/userService';
import { AuthContext } from '../../contexts/AuthContext';

// Real profile editor — previously this screen was hardcoded to display
// "Javeria Zahid" with no API calls. Now it loads the signed-in user from
// /api/user/profile, lets them edit + save via /api/user/profile, and
// uploads avatar images through /api/upload/avatar.
export default function EditProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, setUser } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jazzcashNumber, setJazzcashNumber] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(null);

  // Load from /api/user/profile so the screen always shows what the backend
  // has, not whatever stale snapshot AuthContext is holding.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await getProfile();
        const p = res.data?.data || res.data?.user || {};
        if (cancelled) return;
        setName(p.name || '');
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setJazzcashNumber(p.jazzcashNumber || '');
        setLocation(p.location || '');
        setBio(p.bio || '');
        setAvatar(p.avatar || null);
      } catch (err) {
        // Fall back to cached AuthContext user — better than blank inputs.
        if (user) {
          setName(user.name || '');
          setEmail(user.email || '');
          setPhone(user.phone || '');
          setJazzcashNumber(user.jazzcashNumber || '');
          setLocation(user.location || '');
          setBio(user.bio || '');
          setAvatar(user.avatar || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common.error'), t('mobile.alerts.photoPermissionRequired'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `avatar_${Date.now()}.jpg`,
      });
      const res = await uploadAvatar(formData);
      const url = res.data?.data?.avatar;
      if (url) {
        setAvatar(url);
      }
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('mobile.alerts.avatarUploadFailed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('errors.requiredField'));
      return;
    }
    // JazzCash number is optional but must be a valid Pakistani mobile if set.
    if (jazzcashNumber && !/^03[0-9]{9}$/.test(jazzcashNumber)) {
      Alert.alert(t('common.error'), t('mobile.alerts.jazzcashNumberFormat'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        jazzcashNumber: jazzcashNumber.trim() || undefined,
        location: location.trim() || undefined,
        bio: bio.trim() || undefined,
      };
      const res = await updateProfile(payload);
      const updated = res.data?.data || res.data?.user;
      if (updated && setUser) {
        setUser((prev) => ({ ...(prev || {}), ...updated }));
        // Keep the AsyncStorage snapshot in sync too so the next cold boot
        // doesn't flash the stale profile.
        try { await AsyncStorage.setItem('user', JSON.stringify({ ...(user || {}), ...updated })); } catch {}
      }
      Alert.alert(t('common.success'), t('success.profileUpdated'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('errors.somethingWrong'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const initial = (name || email || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{initial}</Text></View>
              )}
              <TouchableOpacity style={styles.cameraBtn} onPress={handlePickAvatar} disabled={uploadingAvatar}>
                {uploadingAvatar ? <ActivityIndicator color={COLORS.white} size="small" /> : <Camera color={COLORS.white} size={16} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('profile.name')}</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={COLORS.textFaint} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('profile.email')}</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
              placeholderTextColor={COLORS.textFaint}
            />
            <Text style={styles.helperText}>Email cannot be changed.</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('profile.phone')}</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="03XXXXXXXXX"
              placeholderTextColor={COLORS.textFaint}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('profile.jazzcash')}</Text>
            <TextInput
              style={styles.input}
              value={jazzcashNumber}
              onChangeText={setJazzcashNumber}
              keyboardType="phone-pad"
              placeholder={t('profile.jazzcashPlaceholder')}
              placeholderTextColor={COLORS.textFaint}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('profile.location')}</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Lahore, Punjab"
              placeholderTextColor={COLORS.textFaint}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('profile.bio')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder={t('profile.bioPlaceholder')}
              placeholderTextColor={COLORS.textFaint}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={COLORS.white} />
              : (<><Check color={COLORS.white} size={20} /><Text style={styles.saveBtnText}>{t('settings.saveChanges')}</Text></>)}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0 },
  avatarSection: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  avatarContainer: { position: 'relative' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.white },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: COLORS.white },
  avatarText: { color: COLORS.white, fontSize: 40, fontWeight: 'bold' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.info, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.bg },
  formGroup: { marginBottom: 20 },
  label: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, height: 50, color: COLORS.white, fontSize: 15 },
  inputDisabled: { backgroundColor: 'rgba(0,0,0,0.3)', color: COLORS.textFaint },
  helperText: { color: COLORS.textFaint, fontSize: 12, marginTop: 6 },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 16 },
  saveBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12, marginBottom: 40, gap: 8 },
  saveBtnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' }
});
