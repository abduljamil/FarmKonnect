import { COLORS } from '../../constants/colors';
﻿import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, X, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getListingById, updateListing } from '../../services/listingService';
import api from '../../services/api';
import LocationPicker from '../../components/ui/LocationPicker';
import { useTranslation } from 'react-i18next';

export default function EditListingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { id } = route.params || {};

  const [formData, setFormData] = useState({
    title: '',
    category: 'crops',
    price: '',
    unit: '',
    quantity: '1',
    location: '',
    description: '',
    images: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const categories = [
    { label: 'Crops', value: 'crops' },
    { label: 'Livestock', value: 'livestock' },
    { label: 'Equipment', value: 'equipment' },
    { label: 'Fertilizers', value: 'fertilizers' },
    { label: 'Seeds', value: 'seeds' },
    { label: 'Other', value: 'other' }
  ];

  const units = [
    { labelKey: 'createListing.units.kg', value: 'kg' },
    { labelKey: 'createListing.units.quintal', value: 'quintal' },
    { labelKey: 'createListing.units.ton', value: 'ton' },
    { labelKey: 'createListing.units.piece', value: 'piece' },
    { labelKey: 'createListing.units.dozen', value: 'dozen' },
    { labelKey: 'createListing.units.bag', value: 'bag' },
    { labelKey: 'createListing.units.liter', value: 'liter' }
  ];

  useEffect(() => {
    const fetchListing = async () => {
      try {
        if (id) {
          const response = await getListingById(id);
          if (response.data && response.data.data) {
            const item = response.data.data;
            setFormData({
              title: item.title || '',
              category: item.category || 'crops',
              price: item.price ? item.price.toString() : '',
              unit: item.unit || '',
              quantity: item.quantity ? item.quantity.toString() : '1',
              location: item.location || '',
              description: item.description || '',
              images: item.images || []
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch listing', error);
        Alert.alert(t('common.error'), t('mobile.alerts.fetchListingFailed'));
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  // Image management — was a "Change Photo" button with no handler. Now
  // mirrors CreateListingScreen: pick from library or camera, upload to
  // /api/upload/listings, then append the returned URL to formData.images.
  const pickAndUploadImage = async (fromCamera) => {
    if (formData.images.length >= 5) {
      Alert.alert(t('mobile.alerts.limitReached'), t('mobile.alerts.maxImages'));
      return;
    }
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('mobile.alerts.permissionRequired'), t('mobile.alerts.allowAccess'));
      return;
    }
    const result = await (fromCamera
      ? ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, aspect: [4, 3] })
      : ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: false, quality: 0.7, aspect: [4, 3] }));
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingImage(true);
    try {
      const asset = result.assets[0];
      const fd = new FormData();
      fd.append('images', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `listing_${Date.now()}.jpg`,
      });
      const res = await api.post('/upload/listings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const urls = res.data?.data?.images || [];
      if (urls.length > 0) {
        setFormData((prev) => ({ ...prev, images: [...prev.images, ...urls].slice(0, 5) }));
      }
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('mobile.alerts.imageUploadFailed'));
    } finally {
      setUploadingImage(false);
    }
  };

  const promptImageSource = () => {
    Alert.alert(t('mobile.alerts.addPhoto'), t('mobile.alerts.chooseSource'), [
      { text: t('mobile.buttons.camera'),       onPress: () => pickAndUploadImage(true)  },
      { text: t('mobile.buttons.photoLibrary'), onPress: () => pickAndUploadImage(false) },
      { text: t('mobile.buttons.cancel'),       style: 'cancel' },
    ]);
  };

  const removeImage = (index) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleUpdate = async () => {
    if (!formData.title || !formData.price || !formData.category || !formData.location || !formData.description) {
      Alert.alert(t('common.error'), t('mobile.alerts.fillRequiredFields'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        quantity: Number(formData.quantity)
      };

      await updateListing(id, payload);
      Alert.alert(t('common.success'), t('mobile.alerts.listingUpdated'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(t('mobile.alerts.listingUpdateFailed'), error);
      Alert.alert(t('common.error'), error?.response?.data?.message || t('mobile.alerts.listingUpdateFailed'));
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

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Listing</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Photos ({formData.images.length}/5)</Text>
          {formData.images.length > 0 && (
            <FlatList
              data={formData.images}
              horizontal
              keyExtractor={(uri, idx) => `${uri}-${idx}`}
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
              renderItem={({ item, index }) => (
                <View style={styles.imageItem}>
                  <Image source={{ uri: item }} style={styles.imageThumb} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                    <X color={COLORS.white} size={16} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
          {formData.images.length < 5 && (
            <TouchableOpacity style={styles.addImageBox} onPress={promptImageSource} disabled={uploadingImage}>
              {uploadingImage
                ? <ActivityIndicator color={COLORS.primary} />
                : (<><Camera color={COLORS.primary} size={28} /><Text style={styles.addImageText}>Add photo</Text></>)}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput 
            style={styles.input} 
            placeholderTextColor={COLORS.textFaint}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryRow}>
            {categories.map((cat, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.categoryPill, formData.category === cat.value && styles.categoryPillActive]}
                onPress={() => setFormData({ ...formData, category: cat.value })}
              >
                <Text style={[styles.categoryText, formData.category === cat.value && styles.categoryTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.label}>Price *</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              placeholderTextColor={COLORS.textFaint}
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              placeholderTextColor={COLORS.textFaint}
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Unit *</Text>
          <View style={styles.categoryRow}>
            {units.map((u, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.categoryPill, formData.unit === u.value && styles.categoryPillActive]}
                onPress={() => setFormData({ ...formData, unit: u.value })}
              >
                <Text style={[styles.categoryText, formData.unit === u.value && styles.categoryTextActive]}>{t(u.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <LocationPicker
          label="Location *"
          value={{ address: formData.location }}
          onChange={(loc) => setFormData({ ...formData, location: loc.address || '' })}
        />

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholderTextColor={COLORS.textFaint} 
            multiline 
            textAlignVertical="top" 
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleUpdate} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  container: { padding: 20, paddingBottom: 40 },
  imageItem: { position: 'relative', marginRight: 10 },
  imageThumb: { width: 120, height: 120, borderRadius: 12, backgroundColor: COLORS.surface },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  addImageBox: { height: 100, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', backgroundColor: 'rgba(26, 46, 29, 0.5)', alignItems: 'center', justifyContent: 'center' },
  addImageText: { color: COLORS.primary, marginTop: 6, fontSize: 13, fontWeight: '600' },
  formGroup: { marginBottom: 20 },
  label: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, color: COLORS.white, padding: 16, fontSize: 16 },
  textArea: { height: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4 },
  categoryPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border },
  categoryPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.textMuted, fontWeight: '500' },
  categoryTextActive: { color: COLORS.white },
  submitBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  submitBtnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' }
});
