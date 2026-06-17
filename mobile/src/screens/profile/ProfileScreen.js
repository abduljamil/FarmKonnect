import { COLORS } from '../../constants/colors';
import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bell, Settings, LogOut, ChevronRight, User, Mail, Lock, Package, Info, FileText, Shield, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../contexts/AuthContext';
import { getProfile } from '../../services/userService';
import { getMyReviews } from '../../services/reviewService';
import { API_URL } from '../../services/api';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { t } = useTranslation();

  // The auth `user` from login is minimal (no avatar/rating). Fetch the full
  // profile so the avatar + real rating/review count render instead of the
  // hardcoded initial + "0.0 (0)".
  const [profile, setProfile] = useState(user);
  const [reviewCount, setReviewCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getProfile();
        const p = res.data?.data || res.data?.user || res.data;
        if (!cancelled && p && typeof p === 'object') setProfile(p);
      } catch { /* fall back to the auth user */ }
      try {
        const r = await getMyReviews();
        if (!cancelled) setReviewCount((r.data?.data || []).length);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const ratingAvg = Number(profile?.rating?.average ?? 0).toFixed(1);
  const ratingCount = profile?.rating?.count ?? reviewCount ?? 0;
  const initial = (profile?.name || user?.name)?.charAt(0)?.toUpperCase() || 'U';
  // avatar may be a full URL (cloud) or a server-relative path; prefix the API
  // origin for the latter so it loads through the same host (proxy on web).
  const avatarUri = (() => {
    const a = profile?.avatar;
    if (!a) return null;
    if (/^https?:\/\//.test(a)) return a;
    const origin = API_URL.replace(/\/api\/?$/, '');
    return `${origin}${a.startsWith('/') ? '' : '/'}${a}`;
  })();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('mobile.tabs.profile')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Settings color={COLORS.white} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile?.name || user?.name || t('common.unknown')}</Text>
            <Text style={styles.email}>{profile?.email || user?.email}</Text>
            <TouchableOpacity style={styles.ratingRow} activeOpacity={0.8} onPress={() => navigation.navigate('MyReviews')}>
              <Star size={12} color={COLORS.warning} fill={COLORS.warning} />
              <Text style={styles.ratingText}>{ratingAvg} ({ratingCount} {t('profile.reviews')})</Text>
              <ChevronRight size={14} color={COLORS.warning} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <User color={COLORS.primary} size={20} />
              </View>
              <Text style={styles.menuText}>{t('profile.editProfile')}</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyListings')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Package color={COLORS.primary} size={20} />
              </View>
              <Text style={styles.menuText}>{t('marketplace.myListings')}</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyReviews')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Star color={COLORS.primary} size={20} />
              </View>
              <Text style={styles.menuText}>{t('profile.reviews')}</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('PrivacySecurity')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Lock color={COLORS.primary} size={20} />
              </View>
              <Text style={styles.menuText}>{t('settings.tabs.security')}</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('PriceAlerts')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Bell color={COLORS.primary} size={20} />
              </View>
              <Text style={styles.menuText}>{t('nav.priceAlerts')}</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Support')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Mail color={COLORS.primary} size={20} />
              </View>
              <Text style={styles.menuText}>{t('footer.support')}</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AboutUs')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}><Info color={COLORS.primary} size={20} /></View>
              <Text style={styles.menuText}>{t('nav.aboutUs')}</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ContactUs')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}><Mail color={COLORS.primary} size={20} /></View>
              <Text style={styles.menuText}>{t('nav.contactUs')}</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Methodology')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}><Info color={COLORS.primary} size={20} /></View>
              <Text style={styles.menuText}>How forecasts work</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}><Shield color={COLORS.primary} size={20} /></View>
              <Text style={styles.menuText}>{t('footer.privacyPolicy')}</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TermsOfService')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}><FileText color={COLORS.primary} size={20} /></View>
              <Text style={styles.menuText}>{t('footer.termsOfService')}</Text>
            </View>
            <ChevronRight color={COLORS.textFaint} size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut color={COLORS.danger} size={20} />
          <Text style={styles.logoutText}>{t('nav.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  container: { padding: 20, paddingTop: 0 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.4)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 32 },
  avatarPlaceholder: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.surfaceAlt },
  avatarText: { color: COLORS.white, fontSize: 28, fontWeight: 'bold' },
  profileInfo: { marginLeft: 20, flex: 1 },
  name: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  email: { color: COLORS.textMuted, fontSize: 14, marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, alignSelf: 'flex-start' },
  ratingText: { color: COLORS.warning, fontSize: 12, fontWeight: 'bold' },
  section: { marginBottom: 32 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(26, 46, 29, 0.8)', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(22, 163, 74, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuText: { color: '#f3f4f6', fontSize: 16, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});
