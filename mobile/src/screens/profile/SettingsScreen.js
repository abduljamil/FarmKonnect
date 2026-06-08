import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../contexts/AuthContext';
import { Bell, ChevronLeft, Globe, ExternalLink } from 'lucide-react-native';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

// Settings screen — previously had three fake toggles (dark mode, push
// notifications, location services) that maintained local React state but
// had no real effect anywhere. The dark-mode toggle made *this one screen*
// look light, while every other screen stayed dark. Push and location
// switches did nothing at all.
//
// We've removed the cosmetic dark-mode toggle (the rest of the app is hard-
// styled dark right now) and replaced the fake notification/location
// switches with a single "Open device settings" link that takes the user to
// the OS settings page — which is where iOS/Android actually expose the
// real per-app permissions.

export default function SettingsScreen({ navigation }) {
  const { logout } = useContext(AuthContext);
  const { i18n, t } = useTranslation();
  const [isUrdu, setIsUrdu] = useState(i18n.language === 'ur');

  // Hard-styled dark palette — the rest of the app uses these colors too.
  const theme = {
    bg: '#0f1a12',
    cardBg: 'rgba(26, 46, 31, 0.8)',
    text: '#ffffff',
    textMuted: '#a3a3a3',
    border: '#224026',
    iconColor: '#16a34a',
  };

  useEffect(() => {
    setIsUrdu(i18n.language === 'ur');
  }, [i18n.language]);

  const toggleLanguage = (value) => {
    i18n.changeLanguage(value ? 'ur' : 'en');
  };

  const openSystemSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch {
      // Best-effort — some Android OEMs reject openSettings()
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <AnimatedBlobs />

      <View style={[styles.navHeader, { backgroundColor: theme.bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('nav.settings')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('mobile.settings.preferences')}</Text>

        <View style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {/* Language Toggle — the one preference that genuinely works. */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Globe color={theme.iconColor} size={22} />
              <Text style={[styles.label, { color: theme.text }]}>{t('mobile.settings.language')}</Text>
            </View>
            <View style={styles.languageToggle}>
              <Text style={[styles.langText, !isUrdu && styles.langActive, { color: !isUrdu ? theme.iconColor : theme.textMuted }]}>EN</Text>
              <Switch
                value={isUrdu}
                onValueChange={toggleLanguage}
                trackColor={{ false: '#224026', true: '#16a34a' }}
                thumbColor={'#ffffff'}
              />
              <Text style={[styles.langText, isUrdu && styles.langActive, { color: isUrdu ? theme.iconColor : theme.textMuted }]}>UR</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('mobile.settings.appPermissions')}</Text>

        <View style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {/* Notifications + location are OS-managed. We can't toggle them
              from here without an expo-notifications integration, so we
              link out to the OS settings page where they actually live. */}
          <TouchableOpacity style={styles.row} onPress={openSystemSettings}>
            <View style={styles.rowLeft}>
              <Bell color={theme.iconColor} size={22} />
              <Text style={[styles.label, { color: theme.text }]}>{t('mobile.settings.pushNotifications')}</Text>
            </View>
            <ExternalLink color={theme.textMuted} size={18} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={styles.row} onPress={openSystemSettings}>
            <View style={styles.rowLeft}>
              <Text style={{ fontSize: 18, marginRight: 12 }}>📍</Text>
              <Text style={[styles.label, { color: theme.text }]}>{t('mobile.settings.locationServices')}</Text>
            </View>
            <ExternalLink color={theme.textMuted} size={18} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
          onPress={logout}
        >
          <Text style={styles.logoutText}>{t('mobile.settings.logOut')}</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.textMuted }]}>{t('mobile.settings.version')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgElements: { position: 'absolute', width: '100%', height: '100%' },
  blobLeft: { position: 'absolute', top: -100, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(22, 163, 74, 0.1)', transform: [{ scale: 1.5 }] },
  blobRight: { position: 'absolute', bottom: -100, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(22, 163, 74, 0.12)', transform: [{ scale: 1.5 }] },
  navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  container: { padding: 24, paddingBottom: 60 },
  sectionTitle: { fontSize: 15, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12, marginTop: 8, letterSpacing: 1 },
  section: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  label: { fontSize: 16, fontWeight: '500', marginLeft: 12 },
  divider: { height: 1, width: '100%', marginVertical: 12 },
  languageToggle: { flexDirection: 'row', alignItems: 'center' },
  langText: { fontSize: 13, fontWeight: '600', marginHorizontal: 6 },
  langActive: { fontWeight: '700' },
  logoutButton: { borderWidth: 1, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 12 },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  versionText: { textAlign: 'center', fontSize: 13, marginTop: 40 }
});
