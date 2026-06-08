import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

// Condensed mirror of frontend/src/pages/PrivacyPolicy.jsx — same section
// structure, kept short enough to be readable on a phone.
const SECTIONS = [
  {
    title: '1. Introduction',
    body: 'Welcome to FarmKonnect. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.',
  },
  {
    title: '2. Information we collect',
    bullets: [
      'Name, email, and phone number',
      'Profile information and profile pictures',
      'Listing details including product descriptions and images',
      'Transaction history and payment information',
      'Communications between users',
      'Location data for marketplace features',
    ],
  },
  {
    title: '3. How we use your information',
    bullets: [
      'Provide, maintain, and improve our services',
      'Process transactions and send related information',
      'Send notifications about price alerts and market updates',
      'Respond to customer service requests',
      'Detect and prevent fraud',
    ],
  },
  {
    title: '4. Information sharing',
    body: "We don't sell your personal information. Listing details (title, photos, location, seller name) are visible to other users. Payment details are handled by JazzCash / EasyPaisa and not stored on our servers beyond the transaction reference.",
  },
  {
    title: '5. Data security',
    body: 'Sessions use signed JWT tokens. Passwords are hashed with bcrypt. Database is hosted on MongoDB Atlas with TLS in transit. Backups are encrypted at rest.',
  },
  {
    title: '6. Your rights',
    bullets: [
      'Access the data we hold about you',
      'Correct your profile at any time from Settings',
      'Delete your account — wipes your listings, transactions, and chat history',
      'Export your data on request',
    ],
  },
  {
    title: '7. Contact',
    body: 'Email support@farmkonnect.app for any privacy questions.',
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: January 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            {s.body ? <Text style={styles.body}>{s.body}</Text> : null}
            {s.bullets?.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0, paddingBottom: 60 },
  lastUpdated: { color: '#6b7280', fontSize: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  body: { color: '#d4d4d4', fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', marginTop: 6, gap: 8, paddingRight: 12 },
  bulletDot: { color: '#16a34a', fontSize: 14, lineHeight: 21 },
  bulletText: { color: '#d4d4d4', fontSize: 14, lineHeight: 21, flex: 1 },
});
