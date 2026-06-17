import { COLORS } from '../../constants/colors';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sprout, Users, Globe, Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

// Mirrors frontend/src/pages/AboutUs.jsx — same value props, condensed for
// mobile reading.
export default function AboutUsScreen({ navigation }) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nav.aboutUs')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🌾</Text>
          <Text style={styles.heroTitle}>FarmKonnect</Text>
          <Text style={styles.heroTagline}>{t('landing.hero.badge')}</Text>
        </View>

        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.paragraph}>
          We connect Pakistani farmers directly with buyers, cutting out middlemen and
          giving growers real market prices for their crops. From the smallest village
          to the largest mandi, FarmKonnect puts the market in your pocket.
        </Text>

        <Text style={styles.sectionTitle}>What we do</Text>

        <View style={styles.featureRow}>
          <View style={styles.iconBox}><Sprout color={COLORS.primary} size={22} /></View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Live mandi prices</Text>
            <Text style={styles.featureDesc}>Real-time prices from 14+ Punjab cities updated hourly.</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.iconBox}><Users color={COLORS.primary} size={22} /></View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Direct trade</Text>
            <Text style={styles.featureDesc}>Chat with verified buyers, negotiate, and close deals without commission.</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.iconBox}><Globe color={COLORS.primary} size={22} /></View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>AI price forecasts</Text>
            <Text style={styles.featureDesc}>17 years of price history + ML to help you decide when to sell.</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.iconBox}><Heart color={COLORS.primary} size={22} /></View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Built for farmers</Text>
            <Text style={styles.featureDesc}>Available in English and Urdu. Designed for low-bandwidth networks.</Text>
          </View>
        </View>

        <Text style={styles.footerLine}>{t('footer.madeWith')} ❤️ {t('footer.forFarmers')}</Text>
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
  hero: { alignItems: 'center', paddingVertical: 32 },
  heroEmoji: { fontSize: 64, marginBottom: 12 },
  heroTitle: { color: COLORS.white, fontSize: 28, fontWeight: '900' },
  heroTagline: { color: COLORS.primary, fontSize: 14, marginTop: 6, textAlign: 'center' },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginTop: 28, marginBottom: 10 },
  paragraph: { color: '#d4d4d4', fontSize: 14, lineHeight: 22 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(26, 46, 29, 0.5)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 12, gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(22, 163, 74, 0.15)', alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  featureDesc: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  footerLine: { color: COLORS.textFaint, fontSize: 12, textAlign: 'center', marginTop: 36 },
});
