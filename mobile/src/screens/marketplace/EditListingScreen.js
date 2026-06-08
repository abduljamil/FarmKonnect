import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, X, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getListingById, updateListing } from '../../services/listingService';
import api from '../../services/api';
import LocationPicker from '../../components/ui/LocationPicker';

export default function EditListingScreen({ navigation, route }) {
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
        Alert.alert('Error', 'Failed to fetch listing details');
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
      Alert.alert('Limit reached', 'Maximum 5 images per listing.');
      return;
    }
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow access to continue.');
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
      Alert.alert('Error', err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const promptImageSource = () => {
    Alert.alert('Add photo', 'Choose a source', [
      { text: 'Camera',        onPress: () => pickAndUploadImage(true)  },
      { text: 'Photo library', onPress: () => pickAndUploadImage(false) },
      { text: 'Cancel',        style: 'cancel' },
    ]);
  };

  const removeImage = (index) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleUpdate = async () => {
    if (!formData.title || !formData.price || !formData.category || !formData.location || !formData.description) {
      Alert.alert('Error', 'Please fill all required fields');
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
      Alert.alert('Success', 'Listing updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to update listing', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
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
                    <X color="#fff" size={16} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
          {formData.images.length < 5 && (
            <TouchableOpacity style={styles.addImageBox} onPress={promptImageSource} disabled={uploadingImage}>
              {uploadingImage
                ? <ActivityIndicator color="#16a34a" />
                : (<><Camera color="#16a34a" size={28} /><Text style={styles.addImageText}>Add photo</Text></>)}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput 
            style={styles.input} 
            placeholderTextColor="#6b7280"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
            {categories.map((cat, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.categoryPill, formData.category === cat.value && styles.categoryPillActive]}
                onPress={() => setFormData({ ...formData, category: cat.value })}
              >
                <Text style={[styles.categoryText, formData.category === cat.value && styles.categoryTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.label}>Price *</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              placeholderTextColor="#6b7280"
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Unit</Text>
            <TextInput 
              style={styles.input} 
              placeholderTextColor="#6b7280"
              value={formData.unit}
              onChangeText={(text) => setFormData({ ...formData, unit: text })}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              placeholderTextColor="#6b7280"
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            />
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
            placeholderTextColor="#6b7280" 
            multiline 
            textAlignVertical="top" 
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleUpdate} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  imageItem: { position: 'relative', marginRight: 10 },
  imageThumb: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#1a2e1f' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  addImageBox: { height: 100, borderRadius: 12, borderWidth: 1, borderColor: '#224026', borderStyle: 'dashed', backgroundColor: 'rgba(26, 46, 29, 0.5)', alignItems: 'center', justifyContent: 'center' },
  addImageText: { color: '#16a34a', marginTop: 6, fontSize: 13, fontWeight: '600' },
  formGroup: { marginBottom: 20 },
  label: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderWidth: 1, borderColor: '#224026', borderRadius: 12, color: '#fff', padding: 16, fontSize: 16 },
  textArea: { height: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryRow: { flexDirection: 'row', paddingVertical: 4 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderWidth: 1, borderColor: '#224026', marginRight: 10 },
  categoryPillActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  categoryText: { color: '#a3a3a3', fontWeight: '500' },
  categoryTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
