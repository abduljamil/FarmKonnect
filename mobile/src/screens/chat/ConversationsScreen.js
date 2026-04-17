import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, TextInput, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Trash2 } from 'lucide-react-native';
import { getConversations, deleteConversation } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import AnimatedBlobs from '../../components/ui/AnimatedBlobs';

export default function ConversationsScreen({ navigation }) {
  const { user } = useAuth();
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, []);

  const handleDelete = (chatId, name) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete your conversation with ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(chatId);
              setConversations(prev => prev.filter(c => c._id !== chatId));
            } catch (err) {
              console.error('Failed to delete conversation', err);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          }
        }
      ]
    );
  };

  const getOtherParticipant = (chat) => {
    if (!user || !chat) return { name: 'User', avatar: 'https://ui-avatars.com/api/?name=User' };
    
    // Support both object comparison and ID string comparison
    const buyerId = chat.buyer?._id?.toString() || chat.buyer?.toString();
    const sellerId = chat.seller?._id?.toString() || chat.seller?.toString();
    const currentUserId = user._id?.toString() || user.id?.toString();

    const other = buyerId === currentUserId ? chat.seller : chat.buyer;
    
    if (!other || typeof other !== 'object') {
      return { name: 'Participant', avatar: 'https://ui-avatars.com/api/?name=P' };
    }
    
    return {
      name: other.name || 'User',
      avatar: other.avatar || `https://ui-avatars.com/api/?name=${other.name || 'User'}`
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
      <StatusBar barStyle="light-content" backgroundColor="#0f1a12" />
      <AnimatedBlobs />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.searchBar}>
          <Search color="#a3a3a3" size={20} />
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor="#a3a3a3"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView 
          contentContainerStyle={styles.container} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
          }
        >
          {filteredConversations.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#a3a3a3', marginTop: 20 }}>No conversations found.</Text>
          )}
          {filteredConversations.map((chat) => {
            const otherUser = getOtherParticipant(chat);
            const lastMsg = chat.lastMessage || 'Click to start chatting';
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
                key={chat._id} 
                style={styles.chatCard}
                onPress={() => navigation.navigate('ChatScreen', { 
                  conversationId: chat._id, 
                  name: otherUser.name, 
                  avatar: otherUser.avatar 
                })}
              >
                <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
                <View style={styles.chatInfo}>
                  <View style={styles.topRow}>
                    <Text style={styles.chatName}>{otherUser.name}</Text>
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
                        <Trash2 color="#ef4444" size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { padding: 20, paddingTop: 10, zIndex: 1 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 12, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#224026' },
  searchInput: { flex: 1, marginLeft: 12, color: '#fff', fontSize: 16 },
  container: { paddingHorizontal: 20, paddingBottom: 20 },
  chatCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(26, 46, 29, 0.6)', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#224026' },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 16 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  chatTime: { color: '#a3a3a3', fontSize: 12, fontWeight: '500' },
  activeTime: { color: '#16a34a', fontWeight: 'bold' },
  chatMessage: { color: '#a3a3a3', fontSize: 14, flex: 1, paddingRight: 10 },
  unreadMessage: { color: '#fff', fontWeight: '600' },
  unreadBadge: { backgroundColor: '#16a34a', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  deleteBtn: { padding: 4 }
});
