import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { ArrowLeft, Camera, UploadCloud, MapPin, Tag } from 'lucide-react-native';
import { getListingById, updateListing } from '../../services/listingService';

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
        <View style={styles.imageContainer}>
           <Image style={styles.previewImage} source={{ uri: formData.images[0] || 'https://via.placeholder.com/150' }} />
           <TouchableOpacity style={styles.changeImageBtn}>
              <Text style={{color: '#fff'}}>Change Photo</Text>
           </TouchableOpacity>
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
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Location *</Text>
            <TextInput 
              style={styles.input} 
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
  imageContainer: { alignItems: 'center', marginBottom: 24 },
  previewImage: { width: '100%', height: 160, borderRadius: 16, backgroundColor: 'rgba(26, 46, 29, 0.5)' },
  changeImageBtn: { position: 'absolute', bottom: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8 },
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
