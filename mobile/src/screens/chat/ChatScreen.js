import React, { useState, useRef, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Shield, Package, AlertTriangle, CreditCard, Send, Phone, RefreshCcw, Plus, Check, MoreVertical } from 'lucide-react-native';
// Note: ShoppingBag, CheckCheck, X are missing in 1.8.0
import { getMessages, sendMessage } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

export default function ChatScreen({ navigation, route }) {
  const { user } = useAuth();
  const socket = useContext(SocketContext);
  
  const { conversationId, name = 'User', avatar = 'https://ui-avatars.com/api/?name=User' } = route?.params || {};
  
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;

    const fetchLogs = async () => {
      try {
        const res = await getMessages(conversationId);
        if (res.data && res.data.success) {
          setChatLog(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching chat logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();

    if (socket) {
      socket.emit('join_conversation', conversationId);
      socket.emit('mark_read', { conversationId });
      socket.emit('check_online', { userId: route?.params?.otherUserId }); // Assuming ID is passed

      socket.on('new_message', (newMsg) => {
        // Prevent duplicates for the sender who already addedoptimistically
        setChatLog((prev) => {
          const exists = prev.find(m => m._id === newMsg._id || (m.tempId && m.tempId === newMsg.tempId));
          if (exists) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('messages_read', (data) => {
        if (data.conversationId === conversationId) {
          setChatLog(prev => prev.map(m => ({ ...m, read: true })));
        }
      });

      socket.on('online_status', (data) => {
        if (data.userId === route?.params?.otherUserId) {
          setIsOnline(data.isOnline);
        }
      });

      socket.on('offer_updated', (updatedMsg) => {
        setChatLog(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
      });
    }

    return () => {
      if (socket) {
        socket.emit('leave_conversation', conversationId);
        socket.off('new_message');
        socket.off('messages_read');
        socket.off('online_status');
        socket.off('offer_updated');
      }
    };
  }, [conversationId, socket]);

  const handleSend = async () => {
    if (!message.trim() || !conversationId) return;
    
    const content = message.trim();
    const tempId = Date.now().toString();
    
    // Optimistic UI updates
    const tempMsg = {
      _id: tempId,
      tempId,
      content,
      sender: user?._id || user?.id,
      createdAt: new Date().toISOString()
    };
    
    setChatLog(prev => [...prev, tempMsg]);
    setMessage('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await sendMessage(conversationId, content);
      if (res.data && res.data.success) {
        const permanentMsg = res.data.data;
        setChatLog(prev => prev.map(m => m.tempId === tempId ? permanentMsg : m));
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleSendOffer = () => {
    if (!offerAmount || isNaN(offerAmount) || !conversationId || !socket) return;
    
    const amount = parseFloat(offerAmount);
    socket.emit('send_message', {
      conversationId,
      content: `I'd like to offer Rs. ${amount.toLocaleString()}`,
      messageType: 'offer',
      offerAmount: amount
    });
    
    setShowOfferModal(false);
    setOfferAmount('');
  };

  const handleUpdateOffer = (messageId, status) => {
    if (!socket || !messageId) return;
    socket.emit('update_offer', {
      messageId,
      status,
      conversationId
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a110c" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={styles.headerUserInfo}>
          <Image source={{ uri: avatar }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerName}>{name}</Text>
            <Text style={[styles.headerStatus, !isOnline && styles.headerOffline]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}><MoreVertical color="#fff" size={20} /></TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={styles.chatContainer} 
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {chatLog.map((msg) => {
              const currentUserId = (user?._id || user?.id)?.toString();
              const senderId = (msg.sender?._id || msg.sender)?.toString();
              const isMe = senderId === currentUserId;
              
              const date = msg.createdAt ? new Date(msg.createdAt) : new Date();
              const msgTime = !isNaN(date.getTime()) 
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              
              return (
                <View key={msg._id} style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
                  {!isMe && <Image source={{ uri: avatar }} style={styles.bubbleAvatar} />}
                  <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                    <Text style={[styles.bubbleText, isMe ? styles.bubbleTextRight : styles.bubbleTextLeft]}>{msg.content}</Text>
                    
                    {msg.messageType === 'offer' && (
                       <View style={styles.offerCard}>
                          <Text style={styles.offerLabel}>PRICE OFFER</Text>
                          <Text style={styles.offerAmount}>Rs. {msg.offerAmount?.toLocaleString()}</Text>
                          <View style={[styles.offerBadge, styles[`badge${msg.offerStatus || 'pending'}`]]}>
                            <Text style={styles.offerBadgeText}>{msg.offerStatus || 'pending'}</Text>
                          </View>
                          
                          {!isMe && msg.offerStatus === 'pending' && (
                            <View style={styles.offerActions}>
                              <TouchableOpacity 
                                style={[styles.offerBtn, styles.offerBtnAccept]} 
                                onPress={() => handleUpdateOffer(msg._id, 'accepted')}
                              >
                                <Text style={styles.offerBtnText}>Accept</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.offerBtn, styles.offerBtnReject]} 
                                onPress={() => handleUpdateOffer(msg._id, 'rejected')}
                              >
                                <Text style={styles.offerBtnText}>Decline</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {isMe && msg.offerStatus === 'accepted' && (
                            <TouchableOpacity 
                               style={styles.orderBtn}
                               onPress={() => {
                                 const product = msg.conversation?.product || { _id: msg.product };
                                 navigation.navigate('CreateTransaction', { 
                                   listingId: product._id, 
                                   listing: product, 
                                   offerAmount: msg.offerAmount 
                                 });
                               }}
                            >
                               <Package color="#fff" size={16} />
                               <Text style={styles.orderBtnText}>Order Now</Text>
                            </TouchableOpacity>
                          )}
                       </View>
                    )}

                    <View style={styles.bubbleMeta}>
                      <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeRight : styles.bubbleTimeLeft]}>{msgTime}</Text>
                      {isMe && (
                        <Check color={msg.seenBy?.length > 0 ? '#3b82f6' : '#9ca3af'} size={14} style={{ marginLeft: 4 }} />
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.attachBtn} onPress={() => setShowOfferModal(true)}>
            <Plus color="#16a34a" size={24} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#6b7280"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]} onPress={handleSend}>
            <Send color="#fff" size={18} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        <Modal
          visible={showOfferModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowOfferModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Make an Offer</Text>
                <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                  <Text style={{ color: '#a3a3a3', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalLabel}>Enter your offer amount (Rs.)</Text>
              <TextInput
                style={styles.offerInput}
                placeholder="e.g. 5000"
                placeholderTextColor="#6b7280"
                keyboardType="numeric"
                value={offerAmount}
                onChangeText={setOfferAmount}
                autoFocus
              />
              <TouchableOpacity style={styles.submitOfferBtn} onPress={handleSendOffer}>
                <Text style={styles.submitOfferText}>Send Offer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f1a12' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a110c', padding: 16, borderBottomWidth: 1, borderBottomColor: '#224026' },
  backBtn: { padding: 4, marginRight: 8 },
  headerUserInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerStatus: { color: '#16a34a', fontSize: 12, fontWeight: '500' },
  headerOffline: { color: '#6b7280' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  chatContainer: { padding: 16, paddingBottom: 32 },
  bubbleWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  bubbleWrapperLeft: { justifyContent: 'flex-start' },
  bubbleWrapperRight: { justifyContent: 'flex-end' },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 20 },
  bubbleLeft: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#224026' },
  bubbleRight: { backgroundColor: '#16a34a', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22, color: '#fff' },
  bubbleTextLeft: { color: '#e5e7eb' },
  bubbleTextRight: { color: '#fff' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
  bubbleTime: { fontSize: 11 },
  bubbleTimeLeft: { color: '#6b7280' },
  bubbleTimeRight: { color: 'rgba(255,255,255,0.7)' },
  
  offerCard: { marginTop: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  offerLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  offerAmount: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  offerBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  offerBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  badgepending: { backgroundColor: '#2563eb' },
  badgeaccepted: { backgroundColor: '#16a34a' },
  badgerejected: { backgroundColor: '#dc2626' },
  badgecountered: { backgroundColor: '#d97706' },
  offerActions: { flexDirection: 'row', gap: 8 },
  offerBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  offerBtnAccept: { backgroundColor: '#16a34a' },
  offerBtnReject: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  offerBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  orderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', paddingVertical: 10, borderRadius: 8, marginTop: 4 },
  orderBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, backgroundColor: '#0a110c', borderTopWidth: 1, borderTopColor: '#224026' },
  attachBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(26, 46, 29, 0.8)', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#224026' },
  input: { flex: 1, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 22, minHeight: 44, maxHeight: 100, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#224026' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  sendBtnDisabled: { backgroundColor: '#224026', opacity: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1a2e1d', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#224026' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalLabel: { color: '#a3a3a3', fontSize: 14, marginBottom: 12 },
  offerInput: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 12, height: 56, paddingHorizontal: 16, color: '#fff', fontSize: 18, fontWeight: 'bold', borderWidth: 1, borderColor: '#224026', marginBottom: 20 },
  submitOfferBtn: { backgroundColor: '#16a34a', height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitOfferText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
