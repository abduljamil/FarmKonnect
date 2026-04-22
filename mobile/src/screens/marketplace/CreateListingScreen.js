import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, MapPin, Tag, Plus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { createListing } from '../../services/listingService';
import { AuthContext } from '../../contexts/AuthContext';

export default function CreateListingScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);
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
  const [loading, setLoading] = useState(false);

  const categories = [
    { label: 'Crops', value: 'crops' },
    { label: 'Livestock', value: 'livestock' },
    { label: 'Equipment', value: 'equipment' },
    { label: 'Fertilizers', value: 'fertilizers' },
    { label: 'Seeds', value: 'seeds' },
    { label: 'Other', value: 'other' }
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
    Alert.alert('Add Photos', 'Choose an option', [
      { text: 'Camera', onPress: handleTakePhoto },
      { text: 'Photo Library', onPress: handlePickImage },
      { text: 'Cancel', onPress: () => {}, style: 'cancel' }
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
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      let images = [];

      // Upload images if any
      if (formData.images.length > 0) {
        const uploadFormData = new FormData();
        formData.images.forEach((image, index) => {
          uploadFormData.append('images', {
            uri: image.uri,
            type: image.type,
            name: image.name,
          });
        });

        const uploadResponse = await fetch('https://farmkonnect.app/api/upload/listings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload images');
        }

        const uploadData = await uploadResponse.json();
        images = uploadData.data.images;
      }

      // Create listing with image URLs
      const payload = {
        ...formData,
        images,
        price: Number(formData.price),
        quantity: Number(formData.quantity)
      };

      await createListing(payload);
      Alert.alert('Success', 'Listing created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to create listing', error);
      Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Listing</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Images Section */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Photos (Max 5) {formData.images.length > 0 && `${formData.images.length}/5`}</Text>
          
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
                    <X color="#fff" size={20} />
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item, index) => `image_${index}`}
              horizontal
              scrollEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            />
          )}

          {formData.images.length < 5 && (
            <TouchableOpacity style={styles.imageUploadBox} onPress={handlePhotoOptions}>
              <Camera color="#16a34a" size={32} />
              <Text style={styles.imageUploadText}>Tap to add photo</Text>
              <Text style={styles.imageUploadSubtext}>{formData.images.length}/5 photos added</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Premium Wheat 40kg" 
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
            <Text style={styles.label}>Price (?) *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="4800" 
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
              placeholder="e.g. 40kg" 
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
              placeholder="1" 
              keyboardType="numeric" 
              placeholderTextColor="#6b7280"
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Location *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Multan, Punjab" 
              placeholderTextColor="#6b7280"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Tell buyers about your product..." 
            placeholderTextColor="#6b7280" 
            multiline 
            textAlignVertical="top" 
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Post Listing</Text>}
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
  imageUploadBox: { height: 150, backgroundColor: 'rgba(26, 46, 29, 0.5)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#224026', borderStyle: 'dashed', marginBottom: 24 },
  imageUploadText: { color: '#16a34a', marginTop: 12, fontSize: 16, fontWeight: '600' },
  imageUploadSubtext: { color: '#6b7280', marginTop: 6, fontSize: 13 },
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
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  // Image preview styles
  imagePreviewContainer: { position: 'relative', marginRight: 12, marginBottom: 12 },
  imagePreview: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#1a2e1f' },
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
