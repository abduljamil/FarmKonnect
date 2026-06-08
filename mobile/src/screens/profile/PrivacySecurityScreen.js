import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Shield, FileText, X } from 'lucide-react-native';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function PrivacySecurityScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  // State for modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deletePassword, setDeletePassword] = useState('');

  // Loading states
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // PREVIOUSLY this screen called four backend endpoints that don't exist:
  //   GET  /user/privacy-settings, PUT /user/privacy-settings,
  //   GET  /user/login-history,    plus a 2FA toggle with no backend handler.
  // All silently 404'd — the UI looked like it worked but nothing persisted.
  // Removed until the backend gains those routes; the only real features here
  // are change-password and delete-account, both of which work.

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setLoadingPassword(true);
    try {
      const response = await api.put('/user/password', { currentPassword, newPassword });
      if (response.data.success) {
        Alert.alert('Success', 'Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordModal(false);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Error', 'Please enter your password to confirm deletion');
      return;
    }

    setLoadingDelete(true);
    try {
      const response = await api.delete('/user/account', { data: { password: deletePassword } });
      if (response.data.success) {
        Alert.alert('Success', 'Account deleted successfully');
        setShowDeleteModal(false);
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }, 1000);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Security Section */}
        <Text style={styles.sectionTitle}>🔐 Security</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordModal(true)}>
            <View style={styles.menuLeft}>
              <Lock color="#16a34a" size={22} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Change Password</Text>
                <Text style={styles.menuDesc}>Update your login password</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Data & Privacy Section */}
        <Text style={styles.sectionTitle}>📋 Data & Privacy</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem} onPress={() => {
            Alert.alert('Privacy Policy', 'For full privacy policy, please visit our website at farmkonnect.app/privacy', [
              { text: 'OK' }
            ]);
          }}>
            <View style={styles.menuLeft}>
              <FileText color="#16a34a" size={22} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Privacy Policy</Text>
                <Text style={styles.menuDesc}>Review our privacy practices</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => {
            Alert.alert('Terms of Service', 'For full terms of service, please visit our website at farmkonnect.com', [
              { text: 'OK' }
            ]);
          }}>
            <View style={styles.menuLeft}>
              <FileText color="#16a34a" size={22} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Terms of Service</Text>
                <Text style={styles.menuDesc}>Review terms and conditions</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowDeleteModal(true)}>
            <View style={styles.menuLeft}>
              <Shield color="#ef4444" size={22} />
              <View style={styles.menuContent}>
                <Text style={[styles.menuText, { color: '#ef4444' }]}>Delete Account</Text>
                <Text style={styles.menuDesc}>Permanently delete your FarmKonnect account</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🔒 Your privacy and security are important to us. For any concerns or issues, please contact our support team.
          </Text>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor="#6b7280"
                secureTextEntry
                value={passwordForm.currentPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
              />

              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#6b7280"
                secureTextEntry
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
              />

              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#6b7280"
                secureTextEntry
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelBtn]}
                onPress={() => setShowPasswordModal(false)}
                disabled={loadingPassword}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitBtn, loadingPassword && { opacity: 0.5 }]}
                onPress={handleChangePassword}
                disabled={loadingPassword}
              >
                {loadingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#ef4444' }]}>Delete Account</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.warningText}>
                ⚠️ This action cannot be undone. All your data will be permanently deleted, including:
              </Text>
              <Text style={styles.warningListItem}>• Your profile and personal information</Text>
              <Text style={styles.warningListItem}>• All listings and transactions</Text>
              <Text style={styles.warningListItem}>• Chat history and messages</Text>
              <Text style={styles.warningListItem}>• Price alerts</Text>

              <Text style={styles.inputLabel}>Confirm with your password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#6b7280"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelBtn]}
                onPress={() => setShowDeleteModal(false)}
                disabled={loadingDelete}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.deleteBtn, loadingDelete && { opacity: 0.5 }]}
                onPress={handleDeleteAccount}
                disabled={loadingDelete}
              >
                {loadingDelete ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Delete My Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  container: { padding: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#a3a3a3', marginTop: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  section: { backgroundColor: 'rgba(26, 46, 31, 0.6)', borderRadius: 16, borderWidth: 1, borderColor: '#224026', overflow: 'hidden', marginBottom: 20 },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  menuContent: { flex: 1 },
  menuText: { color: '#ffffff', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  menuDesc: { color: '#6b7280', fontSize: 13, lineHeight: 18 },

  divider: { height: 1, backgroundColor: '#224026' },
  
  statusIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(22, 163, 74, 0.1)', justifyContent: 'center', alignItems: 'center' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },

  infoBox: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 12, padding: 16, marginTop: 24, borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  infoText: { color: '#93c5fd', fontSize: 13, lineHeight: 20, fontWeight: '500' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a2e1f', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#224026' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalBody: { padding: 20, maxHeight: 400 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#224026' },

  inputLabel: { color: '#a3a3a3', fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderWidth: 1, borderColor: '#224026', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, color: '#fff', fontSize: 14 },

  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { backgroundColor: '#16a34a' },
  cancelBtn: { backgroundColor: '#3f3f3f' },
  deleteBtn: { backgroundColor: '#ef4444' },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelBtnText: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },

  warningText: { color: '#fca5a5', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  warningListItem: { color: '#fca5a5', fontSize: 12, marginVertical: 4 },

  historyList: { maxHeight: 300 },
  historyItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#224026' },
  historyContent: { gap: 4 },
  historyDate: { color: '#fff', fontSize: 13, fontWeight: '600' },
  historyDevice: { color: '#9ca3af', fontSize: 12 },
  historyIP: { color: '#6b7280', fontSize: 11 },
  statusBadge: { marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, alignSelf: 'flex-start' },
  successBadge: { backgroundColor: 'rgba(22, 163, 74, 0.2)' },
  failedBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
