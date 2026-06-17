import { COLORS } from '../../constants/colors';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

// Condensed mirror of frontend/src/pages/TermsOfService.jsx.
const SECTIONS = [
  {
    title: '1. Acceptance of terms',
    body: 'By creating an account or using FarmKonnect you agree to these terms and our Privacy Policy.',
  },
  {
    title: '2. Eligible users',
    bullets: [
      'You must be 18 or older to create an account',
      'You must provide accurate name, contact details, and listing information',
      'One personal account per user',
    ],
  },
  {
    title: '3. Listings',
    bullets: [
      'Only list crops, livestock, or equipment you legally own and can deliver',
      'Photos must be of the actual product, not stock imagery',
      'Misleading pricing or quantity may result in listing removal and account suspension',
    ],
  },
  {
    title: '4. Transactions and escrow',
    body: 'Payments via JazzCash are held in escrow until the buyer confirms delivery (or the 14-day auto-release window expires). Cash-on-delivery orders are settled directly between buyer and seller; FarmKonnect provides the order record but does not hold the funds.',
  },
  {
    title: '5. Disputes',
    body: 'Either party may raise a dispute within 7 days of completion. Admins review evidence and decide on refunds. Decisions are final.',
  },
  {
    title: '6. Prohibited conduct',
    bullets: [
      'No off-platform offers that bypass escrow',
      'No harassment, hate speech, or fraudulent behavior',
      'No automated scraping of the platform',
    ],
  },
  {
    title: '7. Liability',
    body: 'FarmKonnect is a marketplace — we facilitate transactions but are not party to them. We are not liable for the quality of goods or actions of buyers and sellers beyond the escrow and dispute process.',
  },
  {
    title: '8. Changes',
    body: 'We may update these terms; significant changes will be notified via email and in-app banner.',
  },
];

export default function TermsOfServiceScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
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
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0, paddingBottom: 60 },
  lastUpdated: { color: COLORS.textFaint, fontSize: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  body: { color: '#d4d4d4', fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', marginTop: 6, gap: 8, paddingRight: 12 },
  bulletDot: { color: COLORS.primary, fontSize: 14, lineHeight: 21 },
  bulletText: { color: '#d4d4d4', fontSize: 14, lineHeight: 21, flex: 1 },
});
