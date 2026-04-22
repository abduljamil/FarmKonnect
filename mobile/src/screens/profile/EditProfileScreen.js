import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Check } from 'lucide-react-native';

export default function EditProfileScreen({ navigation }) {
  const [name, setName] = useState('Javeria Zahid');
  const [email, setEmail] = useState('javeriazahid550@gmail.com');
  const [phone, setPhone] = useState('+92 300 1234567');
  const [jazzCash, setJazzCash] = useState('03001234567');
  const [location, setLocation] = useState('Lahore, Punjab');
  const [bio, setBio] = useState('Experienced wheat and corn farmer.');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>J</Text></View>
              <TouchableOpacity style={styles.cameraBtn}>
                <Camera color="#fff" size={16} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#6b7280" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} placeholderTextColor="#6b7280" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#6b7280" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>JazzCash Number (For Payments)</Text>
            <TextInput style={styles.input} value={jazzCash} onChangeText={setJazzCash} keyboardType="phone-pad" placeholderTextColor="#6b7280" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholderTextColor="#6b7280" />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline numberOfLines={4} placeholderTextColor="#6b7280" />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
            <Check color="#fff" size={20} />
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0 },
  avatarSection: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  avatarContainer: { position: 'relative' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3b82f6', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0f1a12' },
  formGroup: { marginBottom: 20 },
  label: { color: '#a3a3a3', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderWidth: 1, borderColor: '#224026', borderRadius: 12, paddingHorizontal: 16, height: 50, color: '#fff', fontSize: 15 },
  inputDisabled: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#6b7280' },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 16 },
  saveBtn: { flexDirection: 'row', backgroundColor: '#16a34a', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12, marginBottom: 40, gap: 8 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
