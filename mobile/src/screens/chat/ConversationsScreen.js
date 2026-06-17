import { COLORS } from '../../constants/colors';
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import Avatar from '../../components/ui/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getConversations, deleteConversation } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

export default function ConversationsScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const socket = useContext(SocketContext);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = async () => {
    try {
      const res = await getConversations();
      if (res.data && res.data.success) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Real-time refresh — was missing. Web subscribes to new_message + new_conversation;
  // mobile previously only polled when the screen was re-focused. Hooking the
  // shared SocketContext means new chats show up instantly.
  useEffect(() => {
    if (!socket) return;
    const onNewMessage = () => fetchConversations();
    const onNewConversation = () => fetchConversations();
    socket.on('new_message', onNewMessage);
    socket.on('new_conversation', onNewConversation);
    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('new_conversation', onNewConversation);
    };
  }, [socket]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, []);

  const handleDelete = (chatId, name) => {
    Alert.alert(
      t('common.delete'),
      `${t('common.delete')}: ${name}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(chatId);
              setConversations(prev => prev.filter(c => c._id !== chatId));
            } catch (err) {
              console.error('Failed to delete conversation', err);
              Alert.alert(t('common.error'), t('errors.somethingWrong'));
            }
          }
        }
      ]
    );
  };

  const getOtherParticipant = (chat) => {
    if (!user || !chat) return { name: 'User', avatar: null, otherUserId: null };

    // Support both object comparison and ID string comparison
    const buyerId = chat.buyer?._id?.toString() || chat.buyer?.toString();
    const currentUserId = user._id?.toString() || user.id?.toString();

    const other = buyerId === currentUserId ? chat.seller : chat.buyer;

    if (!other || typeof other !== 'object') {
      return { name: 'Participant', avatar: null, otherUserId: null };
    }

    return {
      name: other.name || 'User',
      avatar: other.avatar || null,
      otherUserId: other._id?.toString() || null,
    };
  };

  const filteredConversations = conversations
    .filter(c => !!c.lastMessage) // Hide empty conversations
    .filter(c => {
      const other = getOtherParticipant(c);
      return other.name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <AnimatedBlobs />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('chat.title')}</Text>
        <View style={styles.searchBar}>
          <Search color={COLORS.textMuted} size={20} />
          <TextInput
            placeholder={t('common.search')}
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(c, idx) => c?._id || `conv-${idx}`}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginTop: 20 }}>{t('chat.noConversations')}</Text>
          }
          renderItem={({ item: chat }) => {
            const otherUser = getOtherParticipant(chat);
            const lastMsg = chat.lastMessage || t('chat.noConversationsDesc');
            const unreadCount = chat.unreadCount || 0;
            const dateVal = chat.lastMessageAt || chat.updatedAt || chat.createdAt;

            let timeStr = '';
            if (dateVal) {
              try {
                const dateObj = new Date(dateVal);
                if (!isNaN(dateObj.getTime())) {
                  timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              } catch (e) {
                console.error('Date parsing error:', e);
              }
            }

            return (
              <TouchableOpacity
                style={styles.chatCard}
                onPress={() => navigation.navigate('ChatScreen', {
                  conversationId: chat._id,
                  name: otherUser.name,
                  avatar: otherUser.avatar,
                  otherUserId: otherUser.otherUserId,
                })}
              >
                <Avatar uri={otherUser.avatar} size={56} style={{ marginRight: 16 }} />
                <View style={styles.chatInfo}>
                  <View style={styles.topRow}>
                    <Text style={styles.chatName} numberOfLines={1}>{otherUser.name}</Text>
                    <Text style={[styles.chatTime, unreadCount > 0 && styles.activeTime]}>
                      {timeStr}
                    </Text>
                  </View>
                  <View style={styles.bottomRow}>
                    <Text style={[styles.chatMessage, unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>{lastMsg}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{unreadCount}</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(chat._id, otherUser.name)}
                      >
                        <Trash2 color={COLORS.danger} size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, paddingTop: 10, zIndex: 1 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.white, marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 12, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, marginLeft: 12, color: COLORS.white, fontSize: 16 },
  container: { paddingHorizontal: 20, paddingBottom: 20 },
  chatCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(26, 46, 29, 0.6)', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 16 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  chatTime: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500', flexShrink: 0 },
  activeTime: { color: COLORS.primary, fontWeight: 'bold' },
  chatMessage: { color: COLORS.textMuted, fontSize: 14, flex: 1, paddingRight: 10 },
  unreadMessage: { color: COLORS.white, fontWeight: '600' },
  unreadBadge: { backgroundColor: COLORS.primary, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  deleteBtn: { padding: 4 }
});
