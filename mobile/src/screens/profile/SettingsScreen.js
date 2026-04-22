import React, { useContext, useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../contexts/AuthContext';
import { Moon, Sun, Bell, Shield, ChevronLeft } from 'lucide-react-native';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

export default function SettingsScreen({ navigation }) {
  const { logout } = useContext(AuthContext);
  const { i18n, t } = useTranslation(); // Also get the t function to trigger re-renders
  const [isUrdu, setIsUrdu] = useState(i18n.language === 'ur');

  // Local settings states
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  // Sync state with i18n language changes
  useEffect(() => {
    console.log('Language changed to:', i18n.language);
    setIsUrdu(i18n.language === 'ur');
  }, [i18n.language]);

  // Dynamic theme colors (Local simulated theme)
  const theme = {
    bg: isDarkMode ? '#0f1a12' : '#f8fafc',
    cardBg: isDarkMode ? 'rgba(26, 46, 31, 0.8)' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#111827',
    textMuted: isDarkMode ? '#a3a3a3' : '#6b7280',
    border: isDarkMode ? '#224026' : '#e5e7eb',
    iconColor: isDarkMode ? '#16a34a' : '#059669',
  };

  const toggleLanguage = (value) => {
    const newLanguage = value ? 'ur' : 'en';
    console.log('Changing language to:', newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      {/* Background Blobs for Dark Mode */}
      {isDarkMode && <AnimatedBlobs />}

      <View style={[styles.navHeader, { backgroundColor: theme.bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('settings')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('preferences')}</Text>
        
        <View style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {/* Dark Mode Toggle */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              {isDarkMode ? <Moon color={theme.iconColor} size={22} /> : <Sun color={theme.iconColor} size={22} />}
              <Text style={[styles.label, { color: theme.text }]}>{t('dark_mode')}</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: '#d1d5db', true: '#16a34a' }}
              thumbColor={'#ffffff'}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Language Toggle */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={{ fontSize: 18, marginRight: 12 }}>🌏</Text>
              <Text style={[styles.label, { color: theme.text }]}>{t('language')}</Text>
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

        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{t('app_permissions')}</Text>
        
        <View style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          {/* Notifications */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Bell color={theme.iconColor} size={22} />
              <Text style={[styles.label, { color: theme.text }]}>{t('push_notifications')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#d1d5db', true: '#16a34a' }}
              thumbColor={'#ffffff'}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Location */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Shield color={theme.iconColor} size={22} />
              <Text style={[styles.label, { color: theme.text }]}>{t('location_services')}</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: '#d1d5db', true: '#16a34a' }}
              thumbColor={'#ffffff'}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2', borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5' }]} 
          onPress={logout}
        >
          <Text style={styles.logoutText}>{t('log_out')}</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.textMuted }]}>{t('version')}</Text>
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
