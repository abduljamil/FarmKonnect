import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, MessageSquare, PhoneCall, Mail, List } from 'lucide-react-native';
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
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('footer.support')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MyTickets')}>
          <List color="#16a34a" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How can we help you today?</Text>

        <View style={styles.contactMethods}>
          <TouchableOpacity style={styles.methodCard} onPress={handlePhonePress}>
            <View style={styles.methodIcon}><PhoneCall color="#16a34a" size={24} /></View>
            <Text style={styles.methodTitle}>Call Us</Text>
            <Text style={styles.methodDesc}>Mon-Fri, 9am-5pm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.methodCard} onPress={handleEmailPress}>
            <View style={styles.methodIcon}><Mail color="#16a34a" size={24} /></View>
            <Text style={styles.methodTitle}>Email</Text>
            <Text style={styles.methodDesc}>support@farmkonnect.app</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageSquare color="#16a34a" size={20} />
            <Text style={styles.cardTitle}>Submit a Ticket</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Subject (e.g. Escrow Issue)"
            placeholderTextColor="#6b7280"
            value={subject}
            onChangeText={setSubject}
            maxLength={120}
            editable={!submitting}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your issue in detail..."
            placeholderTextColor="#6b7280"
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
              ? <ActivityIndicator color="#fff" />
              : (<><Send color="#fff" size={18} /><Text style={styles.submitText}>Send Message</Text></>)}
          </TouchableOpacity>
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
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  contactMethods: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  methodCard: { flex: 1, backgroundColor: 'rgba(26, 46, 29, 0.4)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#224026' },
  methodIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(22, 163, 74, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  methodTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  methodDesc: { color: '#a3a3a3', fontSize: 12, textAlign: 'center' },
  card: { backgroundColor: 'rgba(26, 46, 29, 0.6)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#224026' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  cardTitle: { color: '#e5e7eb', fontSize: 18, fontWeight: '600' },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 16, height: 50, color: '#fff', fontSize: 15, marginBottom: 12 },
  textArea: { height: 120, textAlignVertical: 'top', paddingTop: 16 },
  submitBtn: { flexDirection: 'row', backgroundColor: '#16a34a', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
