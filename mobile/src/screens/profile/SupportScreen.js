import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MessageSquare, PhoneCall, Mail } from 'lucide-react-native';

export default function SupportScreen({ navigation }) {
  const handleEmailPress = async () => {
    const email = 'support@farmkonnect.com';
    const subject = 'FarmKonnect Support Request';
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    
    try {
      await Linking.openURL(mailtoLink);
    } catch (error) {
      Alert.alert('Error', 'Could not open email app. Please try again.');
    }
  };

  const handlePhonePress = async () => {
    const phoneNumber = '+923001234567'; // Replace with actual support number
    const tellLink = `tel:${phoneNumber}`;
    
    try {
      await Linking.openURL(tellLink);
    } catch (error) {
      Alert.alert('Error', 'Could not open phone app. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How can we help you today?</Text>
        
        <View style={styles.contactMethods}>
          <TouchableOpacity style={styles.methodCard} onPress={handlePhonePress}>
            <View style={styles.methodIcon}><PhoneCall color="#16a34a" size={24} /></View>
            <Text style={styles.methodTitle}>Call Us</Text>
            <Text style={styles.methodDesc}>Mon-Fri, 9am-5pm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.methodCard} onPress={handleEmailPress}>
            <View style={styles.methodIcon}><Mail color="#16a34a" size={24} /></View>
            <Text style={styles.methodTitle}>Email</Text>
            <Text style={styles.methodDesc}>support@farmkonnect.com</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageSquare color="#16a34a" size={20} />
            <Text style={styles.cardTitle}>Submit a Ticket</Text>
          </View>
          <TextInput style={styles.input} placeholder="Subject (e.g. Escrow Issue)" placeholderTextColor="#6b7280" />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Describe your issue in detail..." placeholderTextColor="#6b7280" multiline numberOfLines={5} />
          
          <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.goBack()}>
            <Send color="#fff" size={18} />
            <Text style={styles.submitText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  contactMethods: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  methodCard: { flex: 1, backgroundColor: 'rgba(26, 46, 29, 0.4)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#224026' },
  methodIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(22, 163, 74, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  methodTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  methodDesc: { color: '#a3a3a3', fontSize: 12, textAlign: 'center' },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.6)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#224026' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  cardTitle: { color: '#e5e7eb', fontSize: 18, fontWeight: '600' },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 16, height: 50, color: '#fff', fontSize: 15, marginBottom: 12 },
  textArea: { height: 120, textAlignVertical: 'top', paddingTop: 16 },
  submitBtn: { flexDirection: 'row', backgroundColor: '#16a34a', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
