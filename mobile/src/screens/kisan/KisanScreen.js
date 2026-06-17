import { COLORS } from '../../constants/colors';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Plus, Wrench, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const BRAND_EMOJI = '🌾';
import {
  listConversations,
  startConversation,
  getMessages,
  sendMessage,
  deleteConversation,
} from '../../services/kisanService';

const SUGGESTIONS = [
  "What's the wheat price in Lahore today?",
  'Show me Rice Basmati listings on the marketplace',
  "What's the 4-week cotton price forecast in Multan?",
  'Weather in Faisalabad — any farming tips?',
];

const TOOL_LABELS = {
  searchListings: 'Searching marketplace',
  getCommodityPrice: 'Checking mandi prices',
  getPriceForecast: 'Running AI forecast',
  getWeather: 'Fetching weather',
  createSupportTicket: 'Creating ticket',
};

export default function KisanScreen({ navigation }) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, sending]);

  const refreshConversations = async () => {
    try {
      const res = await listConversations();
      setConversations(res.data?.data || []);
    } catch (e) {
      console.warn('Kisan: list conversations failed', e?.message);
    }
  };

  const loadMessages = async (id) => {
    setLoadingMessages(true);
    try {
      const res = await getMessages(id);
      setMessages(res.data?.data || []);
    } catch (e) {
      console.warn('Kisan: load messages failed', e?.message);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setInput('');
    setHistoryOpen(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteConversation(id);
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      refreshConversations();
    } catch (e) {
      console.warn('Kisan: delete failed', e?.message);
    }
  };

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');

    const tmpUserMsg = {
      _id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tmpUserMsg]);

    try {
      let convoId = activeId;
      if (!convoId) {
        const startRes = await startConversation(text, language);
        convoId = startRes.data?.data?._id;
        setActiveId(convoId);
        if (startRes.data?.data) {
          setConversations((prev) => [startRes.data.data, ...prev]);
        }
      }

      const res = await sendMessage(convoId, text, language);
      const { reply, toolCalls, messageId } = res.data?.data || {};
      setMessages((prev) => [
        ...prev,
        {
          _id: messageId || `m-${Date.now()}`,
          role: 'model',
          content: reply || 'No response',
          toolCalls,
          createdAt: new Date().toISOString(),
        },
      ]);
      refreshConversations();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          _id: `err-${Date.now()}`,
          role: 'model',
          content: `Sorry, something went wrong: ${err?.response?.data?.message || err?.message || 'unknown error'}`,
          error: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarEmoji}>{BRAND_EMOJI}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Kisan</Text>
            <Text style={styles.headerSubtitle}>Your FarmKonnect AI</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setHistoryOpen((s) => !s)}
          style={styles.iconBtn}
        >
          <Text style={styles.historyToggle}>
            {historyOpen ? 'Close' : 'History'}
          </Text>
        </TouchableOpacity>
      </View>

      {historyOpen && (
        <View style={styles.historyPanel}>
          <TouchableOpacity onPress={handleNewChat} style={styles.newChatBtn}>
            <Plus color={COLORS.white} size={16} />
            <Text style={styles.newChatText}>New chat</Text>
          </TouchableOpacity>
          <ScrollView style={{ maxHeight: 220 }}>
            {conversations.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No conversations yet</Text>
            ) : (
              conversations.map((c) => (
                <View key={c._id} style={styles.historyRow}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      setActiveId(c._id);
                      setHistoryOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.historyTitle,
                        activeId === c._id && styles.historyTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {c.title}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(c._id)}>
                    <Trash2 color={COLORS.gray400} size={16} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : null}
      >
        {loadingMessages ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : messages.length === 0 ? (
          <EmptyState onPick={(s) => handleSend(s)} />
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chatContainer}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.map((m) => (
              <MessageRow key={m._id} message={m} />
            ))}
            {sending && (
              <View style={styles.thinkingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.thinkingText}>Kisan is thinking…</Text>
              </View>
            )}
          </ScrollView>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Ask Kisan about prices, listings, weather…"
            placeholderTextColor={COLORS.textFaint}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
            style={[
              styles.sendBtn,
              (!input.trim() || sending) && styles.sendBtnDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Send color={COLORS.white} size={18} />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>
          Kisan can make mistakes — verify important info.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyState({ onPick }) {
  return (
    <ScrollView contentContainerStyle={styles.emptyWrap}>
      <View style={styles.emptyAvatar}>
        <Text style={styles.emptyAvatarEmoji}>{BRAND_EMOJI}</Text>
      </View>
      <Text style={styles.emptyTitle}>Hi, I'm Kisan AI 🌾</Text>
      <Text style={styles.emptySubtitle}>
        How can I help you today? I have live access to FarmKonnect data —
        mandi prices, marketplace listings, weather, and AI forecasts for
        Wheat, Rice, Cotton, Sugar & Maize.
      </Text>
      <View style={styles.suggestionsGrid}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => onPick(s)}
            style={styles.suggestionCard}
          >
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function MessageRow({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userBubbleText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.botRow}>
      <View style={styles.botAvatar}>
        <Text style={styles.botAvatarEmoji}>{BRAND_EMOJI}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <View style={styles.toolChipsRow}>
            {message.toolCalls.map((tc, i) => (
              <View key={i} style={styles.toolChip}>
                <Wrench color="#86efac" size={10} />
                <Text style={styles.toolChipText}>
                  {TOOL_LABELS[tc.name] || tc.name}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View
          style={[
            styles.botBubble,
            message.error && styles.botBubbleError,
          ]}
        >
          <Text
            style={[
              styles.botBubbleText,
              message.error && styles.botBubbleErrorText,
            ]}
          >
            {message.content}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgDeep,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarEmoji: { fontSize: 22, lineHeight: 26 },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  headerSubtitle: { color: '#86efac', fontSize: 11 },
  iconBtn: { padding: 6 },
  historyToggle: {
    color: '#86efac',
    fontSize: 13,
    fontWeight: '600',
  },

  historyPanel: {
    backgroundColor: '#1a2e1d',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  newChatText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  emptyHistoryText: { color: COLORS.textFaint, fontSize: 13, padding: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  historyTitle: { color: COLORS.gray300, fontSize: 13 },
  historyTitleActive: { color: '#86efac', fontWeight: '600' },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatContainer: { padding: 16, paddingBottom: 24 },

  userRow: { alignItems: 'flex-end', marginBottom: 12 },
  userBubble: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
  },
  userBubbleText: { color: COLORS.white, fontSize: 14, lineHeight: 20 },

  botRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  botAvatarEmoji: { fontSize: 14, lineHeight: 18 },
  toolChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22,163,74,0.15)',
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  toolChipText: { color: '#86efac', fontSize: 10, fontWeight: '600' },

  botBubble: {
    backgroundColor: 'rgba(26, 46, 29, 0.8)',
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  botBubbleText: { color: '#e5e7eb', fontSize: 14, lineHeight: 20 },
  botBubbleError: { backgroundColor: 'rgba(127,29,29,0.4)', borderColor: '#7f1d1d' },
  botBubbleErrorText: { color: '#fecaca' },

  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  thinkingText: { color: COLORS.gray400, fontSize: 13 },

  emptyWrap: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyAvatarEmoji: { fontSize: 40, lineHeight: 46 },
  emptyTitle: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  emptySubtitle: {
    color: COLORS.gray400,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 360,
    marginBottom: 20,
    lineHeight: 19,
  },
  suggestionsGrid: { width: '100%', gap: 8 },
  suggestionCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(26, 46, 29, 0.5)',
    borderRadius: 12,
    padding: 12,
  },
  suggestionText: { color: COLORS.gray300, fontSize: 13 },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 4,
    backgroundColor: COLORS.bgDeep,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(26, 46, 29, 0.8)',
    borderRadius: 20,
    minHeight: 44,
    maxHeight: 110,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    color: COLORS.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: { backgroundColor: COLORS.border, opacity: 0.6 },
  disclaimer: {
    textAlign: 'center',
    color: COLORS.textFaint,
    fontSize: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.bgDeep,
  },
});
