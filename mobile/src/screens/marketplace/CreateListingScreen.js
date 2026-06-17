import { COLORS } from '../../constants/colors';
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, MapPin, Tag, Plus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { createListing } from '../../services/listingService';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import LocationPicker from '../../components/ui/LocationPicker';

export default function CreateListingScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: '',
    category: 'crops',
    price: '',
    unit: 'kg',
    quantity: '1',
    location: '',
    description: '',
    images: []
  });
  const [loading, setLoading] = useState(false);

  const categories = [
    { labelKey: 'mobile.createListing.catCrops', value: 'crops' },
    { labelKey: 'marketplace.categories.livestock', value: 'livestock' },
    { labelKey: 'marketplace.categories.equipment', value: 'equipment' },
    { labelKey: 'marketplace.categories.fertilizers', value: 'fertilizers' },
    { labelKey: 'marketplace.categories.seeds', value: 'seeds' },
    { labelKey: 'marketplace.categories.other', value: 'other' }
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

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultiple: true,
      quality: 0.7,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        type: 'image/jpeg',
        name: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
      }));
      
      setFormData({ 
        ...formData, 
        images: [...formData.images, ...newImages].slice(0, 5) // Max 5 images
      });
    }
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets) {
      const newImage = {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
      };
      
      setFormData({ 
        ...formData, 
        images: [...formData.images, newImage].slice(0, 5) // Max 5 images
      });
    }
  };

  const handlePhotoOptions = () => {
    Alert.alert(t('mobile.alerts.addPhotos'), t('mobile.alerts.chooseOption'), [
      { text: t('mobile.buttons.camera'), onPress: handleTakePhoto },
      { text: t('mobile.buttons.photoLibrary'), onPress: handlePickImage },
      { text: t('mobile.buttons.cancel'), onPress: () => {}, style: 'cancel' }
    ]);
  };

  const removeImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.price || !formData.category || !formData.location || !formData.description) {
      Alert.alert(t('common.error'), t('errors.requiredField'));
      return;
    }

    setLoading(true);
    try {
      let images = [];

      // Upload images if any. We use the `api` axios instance (so the request
      // carries the cached auth token and respects the configured API_URL)
      // instead of raw fetch with a hardcoded production URL like before.
      if (formData.images.length > 0) {
        const uploadFormData = new FormData();
        formData.images.forEach((image) => {
          uploadFormData.append('images', {
            uri: image.uri,
            type: image.type,
            name: image.name,
          });
        });

        const uploadResponse = await api.post('/upload/listings', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        images = uploadResponse.data?.data?.images || [];
      }

      // Create listing with image URLs. Note: backend reads ONLY whitelisted
      // fields (title/description/price/category/images/location/quantity/unit)
      // so dropping in `formData` extras like `images` previews is harmless.
      const payload = {
        ...formData,
        images,
        price: Number(formData.price),
        quantity: Number(formData.quantity),
      };

      await createListing(payload);
      Alert.alert(t('common.success'), t('success.listingCreated'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to create listing', error);
      Alert.alert(t('common.error'), error?.response?.data?.message || error.message || t('errors.somethingWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('createListing.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Images Section */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('mobile.createListing.photosMax')} {formData.images.length > 0 && `${formData.images.length}/5`}</Text>
          
          {formData.images.length > 0 && (
            <FlatList
              data={formData.images}
              renderItem={({ item, index }) => (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: item.uri }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <X color={COLORS.white} size={20} />
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item) => item.uri}
              horizontal
              scrollEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            />
          )}

          {formData.images.length < 5 && (
            <TouchableOpacity style={styles.imageUploadBox} onPress={handlePhotoOptions}>
              <Camera color={COLORS.primary} size={32} />
              <Text style={styles.imageUploadText}>{t('mobile.createListing.tapToAddPhoto')}</Text>
              <Text style={styles.imageUploadSubtext}>{t('mobile.createListing.photosAdded', { count: formData.images.length })}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('createListing.form.title')} *</Text>
          <TextInput
            style={styles.input}
            placeholder={t('createListing.form.titlePlaceholder')}
            placeholderTextColor={COLORS.textFaint}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('createListing.form.category')} *</Text>
          <View style={styles.categoryRow}>
            {categories.map((cat, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.categoryPill, formData.category === cat.value && styles.categoryPillActive]}
                onPress={() => setFormData({ ...formData, category: cat.value })}
              >
                <Text style={[styles.categoryText, formData.category === cat.value && styles.categoryTextActive]}>{t(cat.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.label}>{t('createListing.form.price')} *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="4800" 
              keyboardType="numeric" 
              placeholderTextColor={COLORS.textFaint}
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>{t('createListing.form.quantity')} *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="1" 
              keyboardType="numeric" 
              placeholderTextColor={COLORS.textFaint}
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('createListing.form.unit')} *</Text>
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

        {/* Location picker with "Use current location" — replaces the plain
            text field. Stores a string in `formData.location` to match the
            existing backend `Listing.location: String` schema, and also a
            structured object internally so we can persist the lat/lng if
            the backend schema gains coordinates later. */}
        <LocationPicker
          label={`${t('createListing.form.location')} *`}
          value={{ address: formData.location }}
          onChange={(loc) => setFormData({ ...formData, location: loc.address || '' })}
        />

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('createListing.form.description')} *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('createListing.form.descriptionPlaceholder')}
            placeholderTextColor={COLORS.textFaint} 
            multiline 
            textAlignVertical="top" 
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>{t('createListing.submit')}</Text>}
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
  imageUploadBox: { height: 150, backgroundColor: 'rgba(26, 46, 29, 0.5)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', marginBottom: 24 },
  imageUploadText: { color: COLORS.primary, marginTop: 12, fontSize: 16, fontWeight: '600' },
  imageUploadSubtext: { color: COLORS.textFaint, marginTop: 6, fontSize: 13 },
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
  submitBtnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  
  // Image preview styles
  imagePreviewContainer: { position: 'relative', marginRight: 12, marginBottom: 12 },
  imagePreview: { width: 120, height: 120, borderRadius: 12, backgroundColor: COLORS.surface },
  removeImageBtn: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    borderRadius: 16, 
    padding: 4,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
