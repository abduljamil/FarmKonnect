import { COLORS } from '../../constants/colors';
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Shield, FileText, X, Eye, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../contexts/AuthContext';
import { getPrivacySettings, updatePrivacySettings, getLoginHistory } from '../../services/userService';
import api from '../../services/api';

export default function PrivacySecurityScreen({ navigation }) {
  const { t } = useTranslation();
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

  // Privacy settings + login history — these ARE backed by the API
  // (backend/routes/user.js: privacy-settings + login-history). A previous
  // version removed them on the wrong assumption they 404'd.
  const [privacy, setPrivacy] = useState({ isProfilePrivate: false, showOnlineStatus: true });
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getPrivacySettings();
        if (cancelled) return;
        const d = res.data?.data || {};
        setPrivacy({
          isProfilePrivate: !!d.isProfilePrivate,
          showOnlineStatus: d.showOnlineStatus !== false,
        });
      } catch {
        // Non-fatal — keep defaults.
      } finally {
        if (!cancelled) setPrivacyLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const togglePrivacy = async (key, value) => {
    const prev = privacy;
    setPrivacy({ ...privacy, [key]: value }); // optimistic
    setSavingPrivacy(true);
    try {
      await updatePrivacySettings({ [key]: value });
    } catch (error) {
      setPrivacy(prev); // revert on failure
      Alert.alert(t('common.error'), error.response?.data?.message || t('mobile.alerts.privacyUpdateFailed'));
    } finally {
      setSavingPrivacy(false);
    }
  };

  const openLoginHistory = async () => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await getLoginHistory();
      setLoginHistory(res.data?.data || []);
    } catch {
      setLoginHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('mobile.alerts.fillAllPasswordFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('mobile.alerts.passwordsNoMatch'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('mobile.alerts.passwordMinLength'));
      return;
    }

    setLoadingPassword(true);
    try {
      const response = await api.put('/user/password', { currentPassword, newPassword });
      if (response.data.success) {
        Alert.alert(t('common.success'), t('mobile.alerts.passwordChanged'));
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordModal(false);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('mobile.alerts.passwordChangeFailed'));
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert(t('common.error'), t('mobile.alerts.confirmDeletePassword'));
      return;
    }

    setLoadingDelete(true);
    try {
      const response = await api.delete('/user/account', { data: { password: deletePassword } });
      if (response.data.success) {
        Alert.alert(t('common.success'), t('mobile.alerts.accountDeleted'));
        setShowDeleteModal(false);
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }, 1000);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('mobile.alerts.accountDeleteFailed'));
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
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
              <Lock color={COLORS.primary} size={22} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Change Password</Text>
                <Text style={styles.menuDesc}>Update your login password</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Privacy preferences — persisted via /user/privacy-settings */}
        <Text style={styles.sectionTitle}>🔏 Privacy</Text>
        <View style={styles.section}>
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Eye color={COLORS.primary} size={22} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Private Profile</Text>
                <Text style={styles.menuDesc}>Hide your profile details from other users</Text>
              </View>
            </View>
            <Switch
              value={privacy.isProfilePrivate}
              onValueChange={(v) => togglePrivacy('isProfilePrivate', v)}
              disabled={!privacyLoaded || savingPrivacy}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Shield color={COLORS.primary} size={22} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Show Online Status</Text>
                <Text style={styles.menuDesc}>Let others see when you're active</Text>
              </View>
            </View>
            <Switch
              value={privacy.showOnlineStatus}
              onValueChange={(v) => togglePrivacy('showOnlineStatus', v)}
              disabled={!privacyLoaded || savingPrivacy}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={openLoginHistory}>
            <View style={styles.menuLeft}>
              <Clock color={COLORS.primary} size={22} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Login History</Text>
                <Text style={styles.menuDesc}>Review recent sign-ins to your account</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Data & Privacy Section */}
        <Text style={styles.sectionTitle}>📋 Data & Privacy</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <View style={styles.menuLeft}>
              <FileText color={COLORS.primary} size={22} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Privacy Policy</Text>
                <Text style={styles.menuDesc}>Review our privacy practices</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TermsOfService')}>
            <View style={styles.menuLeft}>
              <FileText color={COLORS.primary} size={22} />
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Terms of Service</Text>
                <Text style={styles.menuDesc}>Review terms and conditions</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowDeleteModal(true)}>
            <View style={styles.menuLeft}>
              <Shield color={COLORS.danger} size={22} />
              <View style={styles.menuContent}>
                <Text style={[styles.menuText, { color: COLORS.danger }]}>Delete Account</Text>
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
                <X color={COLORS.white} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor={COLORS.textFaint}
                secureTextEntry
                value={passwordForm.currentPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
              />

              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={COLORS.textFaint}
                secureTextEntry
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
              />

              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.textFaint}
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
                  <ActivityIndicator color={COLORS.white} size="small" />
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
              <Text style={[styles.modalTitle, { color: COLORS.danger }]}>Delete Account</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <X color={COLORS.white} size={24} />
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
                placeholderTextColor={COLORS.textFaint}
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
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Delete My Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Login History Modal */}
      <Modal visible={showHistoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Login History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <X color={COLORS.white} size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {loadingHistory ? (
                <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 24 }} />
              ) : loginHistory.length === 0 ? (
                <Text style={styles.emptyText}>No login history available.</Text>
              ) : (
                <ScrollView style={styles.historyList}>
                  {loginHistory.slice().reverse().map((h, i) => {
                    const when = h.timestamp || h.date || h.loginAt;
                    const device = h.device || h.userAgent;
                    const ip = h.ip || h.ipAddress;
                    const failed = h.success === false;
                    return (
                      <View key={i} style={styles.historyItem}>
                        <View style={styles.historyContent}>
                          <Text style={styles.historyDate}>
                            {when ? new Date(when).toLocaleString() : 'Unknown time'}
                          </Text>
                          {!!device && <Text style={styles.historyDevice}>{device}</Text>}
                          {!!ip && <Text style={styles.historyIP}>IP: {ip}</Text>}
                          <View style={[styles.statusBadge, failed ? styles.failedBadge : styles.successBadge]}>
                            <Text style={[styles.statusText, failed && { color: COLORS.danger }]}>
                              {failed ? 'FAILED' : 'SUCCESS'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  container: { padding: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, marginTop: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  section: { backgroundColor: 'rgba(26, 46, 31, 0.6)', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 20 },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  menuContent: { flex: 1 },
  menuText: { color: COLORS.white, fontSize: 16, fontWeight: '500', marginBottom: 4 },
  menuDesc: { color: COLORS.textFaint, fontSize: 13, lineHeight: 18 },

  divider: { height: 1, backgroundColor: COLORS.border },
  
  statusIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(22, 163, 74, 0.1)', justifyContent: 'center', alignItems: 'center' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },

  infoBox: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 12, padding: 16, marginTop: 24, borderLeftWidth: 4, borderLeftColor: COLORS.info },
  infoText: { color: '#93c5fd', fontSize: 13, lineHeight: 20, fontWeight: '500' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  modalBody: { padding: 20, maxHeight: 400 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border },

  inputLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, color: COLORS.white, fontSize: 14 },

  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { backgroundColor: COLORS.primary },
  cancelBtn: { backgroundColor: '#3f3f3f' },
  deleteBtn: { backgroundColor: COLORS.danger },
  submitBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  cancelBtnText: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },

  warningText: { color: '#fca5a5', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  warningListItem: { color: '#fca5a5', fontSize: 12, marginVertical: 4 },

  historyList: { maxHeight: 300 },
  historyItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyContent: { gap: 4 },
  historyDate: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  historyDevice: { color: COLORS.gray400, fontSize: 12 },
  historyIP: { color: COLORS.textFaint, fontSize: 11 },
  statusBadge: { marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, alignSelf: 'flex-start' },
  successBadge: { backgroundColor: 'rgba(22, 163, 74, 0.2)' },
  failedBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  statusText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  emptyText: { color: COLORS.textFaint, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
