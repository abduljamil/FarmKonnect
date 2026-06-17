import { COLORS } from '../../constants/colors';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Shield } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getTicket, addMessage } from '../../services/supportService';

// Ticket conversation view — backend exposes /api/support/tickets/:id (read)
// and POST /api/support/tickets/:id/messages (reply). Each message has
// `sender: 'user' | 'admin' | 'system'` so we render them in two columns.
export default function TicketDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { id } = route?.params || {};

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const fetchTicket = async () => {
    try {
      const res = await getTicket(id);
      setTicket(res.data?.data || null);
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('errors.somethingWrong'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await addMessage(id, reply.trim());
      setReply('');
      await fetchTicket();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.message || t('errors.somethingWrong'));
    } finally {
      setSending(false);
    }
  };

  if (loading || !ticket) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{ticket.subject}</Text>
          <Text style={styles.headerSub}>Status: {ticket.status?.replace('_', ' ') || 'open'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.container}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {(ticket.messages || []).map((m, i) => {
            const fromAdmin = m.sender === 'admin';
            const isSystem = m.sender === 'system';
            return (
              <View
                key={m._id || i}
                style={[
                  styles.bubbleRow,
                  isSystem ? styles.bubbleRowCenter : fromAdmin ? styles.bubbleRowLeft : styles.bubbleRowRight,
                ]}
              >
                {isSystem ? (
                  <View style={styles.systemBubble}>
                    <Shield color={COLORS.gray400} size={14} />
                    <Text style={styles.systemText}>{m.content}</Text>
                  </View>
                ) : (
                  <View style={[styles.bubble, fromAdmin ? styles.bubbleLeft : styles.bubbleRight]}>
                    <Text style={styles.bubbleSender}>{m.senderName || (fromAdmin ? 'Support' : 'You')}</Text>
                    <Text style={styles.bubbleText}>{m.content}</Text>
                    <Text style={styles.bubbleTime}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {isClosed ? (
          <View style={styles.closedBar}>
            <Text style={styles.closedText}>This ticket is {ticket.status}. Open a new one if you need more help.</Text>
          </View>
        ) : (
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={reply}
              onChangeText={setReply}
              placeholder="Type your reply..."
              placeholderTextColor={COLORS.textFaint}
              multiline
              editable={!sending}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending || !reply.trim()}>
              {sending ? <ActivityIndicator color={COLORS.white} /> : <Send color={COLORS.white} size={18} />}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  backBtn: { padding: 4 },
  container: { padding: 20, paddingTop: 0, paddingBottom: 20 },
  bubbleRow: { marginBottom: 12, flexDirection: 'row' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubbleRowCenter: { justifyContent: 'center' },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14 },
  bubbleLeft: { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.3)', borderWidth: 1 },
  bubbleRight: { backgroundColor: 'rgba(22, 163, 74, 0.15)', borderColor: 'rgba(22, 163, 74, 0.4)', borderWidth: 1 },
  bubbleSender: { color: COLORS.gray400, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  bubbleText: { color: COLORS.white, fontSize: 14, lineHeight: 20 },
  bubbleTime: { color: COLORS.textFaint, fontSize: 10, marginTop: 6 },
  systemBubble: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(107, 114, 128, 0.15)' },
  systemText: { color: COLORS.gray400, fontSize: 12 },
  closedBar: { padding: 16, borderTopWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  closedText: { color: COLORS.gray400, fontSize: 13, textAlign: 'center' },
  composer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: COLORS.border, gap: 10, alignItems: 'flex-end' },
  composerInput: { flex: 1, maxHeight: 100, color: COLORS.white, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: COLORS.inputBorder },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});
