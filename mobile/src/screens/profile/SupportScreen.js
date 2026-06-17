import { COLORS } from '../../constants/colors';
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MessageSquare, PhoneCall, Mail, List, LifeBuoy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { createTicket } from '../../services/supportService';
import { AuthContext } from '../../contexts/AuthContext';

// Real support ticket flow. Previously this screen had uncontrolled inputs
// and a "Send Message" button that just navigated back — the backend
// endpoint /api/support/tickets exists and works, but nothing was calling it.
export default function SupportScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleEmailPress = async () => {
    const email = 'support@farmkonnect.app';
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent('FarmKonnect Support Request')}`;
    try {
      await Linking.openURL(mailtoLink);
    } catch {
      Alert.alert(t('common.error'), 'Could not open email app.');
    }
  };

  const handlePhonePress = async () => {
    // TODO: replace with the real support line once you have one.
    const phoneNumber = '+923001234567';
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch {
      Alert.alert(t('common.error'), 'Could not open phone app.');
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || subject.trim().length < 3) {
      Alert.alert(t('common.error'), 'Please enter a subject (at least 3 characters).');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      Alert.alert(t('common.error'), 'Please describe your issue (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        subject: subject.trim(),
        message: message.trim(),
        category: 'other',
      };
      // The backend accepts guest tickets but requires guestEmail when not
      // authenticated. Mobile only renders this screen for signed-in users
      // (it's behind the protected stack), so we don't need to set those.
      if (!user) {
        Alert.alert(t('common.error'), 'You must be signed in to submit a support ticket.');
        return;
      }
      await createTicket(payload);
      setSubject('');
      setMessage('');
      Alert.alert(
        t('common.success'),
        'Your ticket has been submitted. Our team will reply via email.',
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('errors.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('footer.support')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MyTickets')}>
          <List color={COLORS.primary} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <View style={styles.bannerIconBox}>
            <LifeBuoy color={COLORS.primary} size={28} />
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>How can we help?</Text>
            <Text style={styles.bannerDesc}>Our support team is always ready to assist you with any questions or issues.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contact Options</Text>

        <View style={styles.contactMethods}>
          <TouchableOpacity style={styles.methodRow} onPress={handlePhonePress}>
            <View style={styles.methodIconRow}><PhoneCall color={COLORS.primary} size={24} /></View>
            <View style={styles.methodTextCol}>
              <Text style={styles.methodTitleRow}>Call Us</Text>
              <Text style={styles.methodDescRow}>Mon-Fri, 9am-5pm</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.methodRow} onPress={handleEmailPress}>
            <View style={styles.methodIconRow}><Mail color={COLORS.primary} size={24} /></View>
            <View style={styles.methodTextCol}>
              <Text style={styles.methodTitleRow}>Email Support</Text>
              <Text style={styles.methodDescRow}>support@farmkonnect.app</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Send us a Message</Text>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageSquare color={COLORS.primary} size={20} />
            <Text style={styles.cardTitle}>Submit a Ticket</Text>
          </View>
          
          <Text style={styles.inputLabel}>Subject *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Issue with payment"
            placeholderTextColor={COLORS.textFaint}
            value={subject}
            onChangeText={setSubject}
            maxLength={120}
            editable={!submitting}
          />

          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Please describe your issue in detail..."
            placeholderTextColor={COLORS.textFaint}
            multiline
            numberOfLines={5}
            value={message}
            onChangeText={setMessage}
            maxLength={2000}
            editable={!submitting}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color={COLORS.white} />
              : (<><Send color={COLORS.white} size={18} /><Text style={styles.submitText}>Submit Ticket</Text></>)}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22, 163, 74, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.primary, marginBottom: 24 },
  bannerIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(22, 163, 74, 0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTextCol: { marginLeft: 16, flex: 1 },
  bannerTitle: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  bannerDesc: { color: '#e5e7eb', fontSize: 13, lineHeight: 20 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', marginLeft: 4 },
  contactMethods: { gap: 12, marginBottom: 24 },
  methodRow: { flexDirection: 'row', backgroundColor: 'rgba(26, 46, 29, 0.6)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  methodIconRow: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(22, 163, 74, 0.1)', justifyContent: 'center', alignItems: 'center' },
  methodTextCol: { marginLeft: 16, flex: 1 },
  methodTitleRow: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  methodDescRow: { color: COLORS.textMuted, fontSize: 14 },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.6)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 30 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10, paddingBottom: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  cardTitle: { color: '#f3f4f6', fontSize: 18, fontWeight: 'bold' },
  inputLabel: { color: '#e5e7eb', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 12, paddingHorizontal: 16, height: 50, color: COLORS.white, fontSize: 15, marginBottom: 20 },
  textArea: { height: 120, textAlignVertical: 'top', paddingTop: 16 },
  submitBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 8 },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' }
});
