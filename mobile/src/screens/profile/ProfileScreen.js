import React, { useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Search, Bell, Settings, LogOut, ChevronRight, User, Mail, Moon, Globe, Package } from 'lucide-react-native';
import { AuthContext } from '../../contexts/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Settings color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || 'User'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>⭐ {user?.rating || '0.0'} ({user?.reviewsCount || 0} reviews)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <User color="#16a34a" size={20} />
              </View>
              <Text style={styles.menuText}>Personal Details</Text>
            </View>
            <ChevronRight color="#6b7280" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyListings')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Package color="#16a34a" size={20} />
              </View>
              <Text style={styles.menuText}>My Listings</Text>
            </View>
            <ChevronRight color="#6b7280" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Globe color="#16a34a" size={20} />
              </View>
              <Text style={styles.menuText}>Language (EN / UR)</Text>
            </View>
            <ChevronRight color="#6b7280" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('PriceAlerts')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Bell color="#16a34a" size={20} />
              </View>
              <Text style={styles.menuText}>Price Alerts</Text>
            </View>
            <ChevronRight color="#6b7280" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Support')}>
            <View style={styles.menuLeft}>
              <View style={styles.iconCircle}>
                <Mail color="#16a34a" size={20} />
              </View>
              <Text style={styles.menuText}>Help & Support</Text>
            </View>
            <ChevronRight color="#6b7280" size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  container: { padding: 20, paddingTop: 0 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.4)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#224026', marginBottom: 32 },
  avatarPlaceholder: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  profileInfo: { marginLeft: 20, flex: 1 },
  name: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  email: { color: '#a3a3a3', fontSize: 14, marginBottom: 8 },
  ratingRow: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  ratingText: { color: '#fbbf24', fontSize: 12, fontWeight: 'bold' },
  section: { marginBottom: 32 },
  sectionTitle: { color: '#a3a3a3', fontSize: 14, fontWeight: '600', marginBottom: 16, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(26, 46, 29, 0.8)', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#224026' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(22, 163, 74, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuText: { color: '#f3f4f6', fontSize: 16, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});
