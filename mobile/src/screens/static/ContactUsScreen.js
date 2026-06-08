import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, PhoneCall, MapPin, MessageSquare, Globe } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

// Mirrors frontend/src/pages/ContactUs.jsx. Mobile launches the native
// mail / dialer / browser apps instead of rendering an iframe form.
export default function ContactUsScreen({ navigation }) {
  const { t } = useTranslation();

  const open = async (url) => {
    try { await Linking.openURL(url); } catch { Alert.alert(t('common.error'), `Could not open ${url}`); }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nav.contactUs')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>Reach our team — we typically respond within 24 hours.</Text>

        <TouchableOpacity style={styles.card} onPress={() => open('mailto:support@farmkonnect.app')}>
          <View style={styles.iconBox}><Mail color="#16a34a" size={22} /></View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Email</Text>
            <Text style={styles.cardLink}>support@farmkonnect.app</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => open('tel:+923001234567')}>
          <View style={styles.iconBox}><PhoneCall color="#16a34a" size={22} /></View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Call</Text>
            <Text style={styles.cardLink}>+92 300 1234567</Text>
            <Text style={styles.cardSub}>Mon–Fri, 9am–5pm PKT</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Support')}>
          <View style={styles.iconBox}><MessageSquare color="#16a34a" size={22} /></View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Submit a support ticket</Text>
            <Text style={styles.cardSub}>Track replies inside the app</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => open('https://www.farmkonnect.app')}>
          <View style={styles.iconBox}><Globe color="#16a34a" size={22} /></View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Website</Text>
            <Text style={styles.cardLink}>www.farmkonnect.app</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.card, { alignItems: 'flex-start' }]}>
          <View style={styles.iconBox}><MapPin color="#16a34a" size={22} /></View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Address</Text>
            <Text style={styles.cardSub}>Lahore, Punjab — Pakistan</Text>
          </View>
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
  lead: { color: '#a3a3a3', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.5)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#224026', marginBottom: 12, gap: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(22, 163, 74, 0.15)', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cardLink: { color: '#16a34a', fontSize: 13, marginTop: 2 },
  cardSub: { color: '#a3a3a3', fontSize: 12, marginTop: 2 },
});
