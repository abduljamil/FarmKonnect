import { COLORS } from '../../constants/colors';
import React, { useState, useRef, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import Avatar from '../../components/ui/Avatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Shield, Package, AlertTriangle, CreditCard, Send, Phone, RefreshCcw, Plus, Check, MoreVertical } from 'lucide-react-native';
// Note: ShoppingBag, CheckCheck, X are missing in 1.8.0
import { getMessages, sendMessage } from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';
import { useTranslation } from 'react-i18next';

export default function ChatScreen({ navigation, route }) {
  const { user } = useAuth();
  const socket = useContext(SocketContext);
  const { t } = useTranslation();
  
  const { conversationId, name = 'User', avatar = null } = route?.params || {};
  
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollViewRef = useRef(null);
  const typingStopRef = useRef(null);   // debounce our own stop_typing emit
  const typingClearRef = useRef(null);  // auto-clear the other party's indicator

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

    // Store handler refs so cleanup can `socket.off(event, handler)` instead
    // of `socket.off(event)` — the latter removes ALL listeners for that
    // event across the whole app, including ones from other screens sharing
    // the SocketContext singleton.
    const handleNewMessage = (newMsg) => {
      setChatLog((prev) => {
        // Already have the server message — ignore the echo.
        if (newMsg._id && prev.some((m) => m._id === newMsg._id)) return prev;
        // If this is the server's echo of a message WE just sent optimistically,
        // replace our pending bubble instead of appending a duplicate. The
        // socket echo doesn't carry our client-side tempId, so we reconcile on
        // sender + content.
        const myId = (user?._id || user?.id)?.toString();
        const senderId = (newMsg.sender?._id || newMsg.sender)?.toString();
        if (myId && senderId === myId) {
          const idx = prev.findIndex((m) => m.pending && m.content === newMsg.content);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = newMsg;
            return next;
          }
        }
        return [...prev, newMsg];
      });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const handleMessagesRead = (data) => {
      if (data.conversationId === conversationId) {
        setChatLog(prev => prev.map(m => ({ ...m, read: true })));
      }
    };

    const handleOnlineStatus = (data) => {
      if (data.userId === route?.params?.otherUserId) {
        setIsOnline(data.isOnline);
      }
    };

    const handleOfferUpdated = (updatedMsg) => {
      setChatLog(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
    };

    // Typing indicator from the other party. Server broadcasts `user_typing`
    // (with the typer's id) and `user_stop_typing`. We also auto-clear after a
    // few seconds in case a stop event is dropped.
    const handleUserTyping = (data) => {
      const myId = (user?._id || user?.id)?.toString();
      if (data?.userId && data.userId.toString() === myId) return; // ignore our own echo
      setOtherTyping(true);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      typingClearRef.current = setTimeout(() => setOtherTyping(false), 4000);
    };
    const handleUserStopTyping = () => {
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      setOtherTyping(false);
    };

    if (socket) {
      socket.emit('join_conversation', conversationId);
      socket.emit('mark_read', { conversationId });
      if (route?.params?.otherUserId) {
        socket.emit('check_online', { userId: route.params.otherUserId });
      }

      socket.on('new_message', handleNewMessage);
      socket.on('messages_read', handleMessagesRead);
      socket.on('online_status', handleOnlineStatus);
      socket.on('offer_updated', handleOfferUpdated);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stop_typing', handleUserStopTyping);
    }

    return () => {
      if (socket) {
        socket.emit('leave_conversation', conversationId);
        socket.off('new_message', handleNewMessage);
        socket.off('messages_read', handleMessagesRead);
        socket.off('online_status', handleOnlineStatus);
        socket.off('offer_updated', handleOfferUpdated);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_stop_typing', handleUserStopTyping);
      }
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
    };
  }, [conversationId, socket, route?.params?.otherUserId]);

  // Emit `typing` as the user types, with a debounced `stop_typing`.
  const handleType = (text) => {
    setMessage(text);
    if (!socket || !conversationId) return;
    socket.emit('typing', { conversationId });
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    typingStopRef.current = setTimeout(() => {
      socket.emit('stop_typing', { conversationId });
    }, 1500);
  };

  const handleSend = async () => {
    if (!message.trim() || !conversationId) return;
    
    const content = message.trim();
    const tempId = Date.now().toString();
    
    // Optimistic UI updates. `pending` lets the socket-echo handler reconcile
    // this bubble instead of duplicating it, and lets us flag it failed below.
    const tempMsg = {
      _id: tempId,
      tempId,
      content,
      sender: user?._id || user?.id,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setChatLog(prev => [...prev, tempMsg]);
    setMessage('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await sendMessage(conversationId, content);
      if (res.data && res.data.success) {
        const permanentMsg = res.data.data;
        // Replace our temp bubble AND drop any duplicate the socket echo may
        // have already inserted before this response landed.
        setChatLog(prev => {
          const cleaned = prev.filter(m => m.tempId !== tempId && m._id !== permanentMsg._id);
          return [...cleaned, permanentMsg];
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Mark the optimistic bubble as failed instead of leaving it "pending"
      // forever, so the user knows it didn't send.
      setChatLog(prev => prev.map(m => m.tempId === tempId ? { ...m, pending: false, failed: true } : m));
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </TouchableOpacity>
        <View style={styles.headerUserInfo}>
          <Avatar uri={avatar} size={40} style={{ marginRight: 12 }} />
          <View>
            <Text style={styles.headerName}>{name}</Text>
            <Text style={[styles.headerStatus, !isOnline && !otherTyping && styles.headerOffline]}>
              {otherTyping ? t('mobile.chat.typing') : isOnline ? t('mobile.chat.online') : t('mobile.chat.offline')}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}><MoreVertical color={COLORS.white} size={20} /></TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : null}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
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
                  {!isMe && <Avatar uri={avatar} size={28} style={{ marginRight: 8 }} />}
                  <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                    <Text style={[styles.bubbleText, isMe ? styles.bubbleTextRight : styles.bubbleTextLeft]}>{msg.content}</Text>
                    
                    {msg.messageType === 'offer' && (
                       <View style={styles.offerCard}>
                          <Text style={styles.offerLabel}>{t('mobile.chat.priceOffer')}</Text>
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
                                <Text style={styles.offerBtnText}>{t('mobile.chat.accept')}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.offerBtn, styles.offerBtnReject]} 
                                onPress={() => handleUpdateOffer(msg._id, 'rejected')}
                              >
                                <Text style={styles.offerBtnText}>{t('mobile.chat.decline')}</Text>
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
                               <Package color={COLORS.white} size={16} />
                               <Text style={styles.orderBtnText}>{t('mobile.chat.orderNow')}</Text>
                            </TouchableOpacity>
                          )}
                       </View>
                    )}

                    <View style={styles.bubbleMeta}>
                      <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeRight : styles.bubbleTimeLeft]}>{msgTime}</Text>
                      {isMe && msg.failed ? (
                        <Text style={styles.failedText}>⚠ {t('mobile.chat.notDelivered')}</Text>
                      ) : isMe && (
                        <Check color={msg.seenBy?.length > 0 ? COLORS.info : COLORS.gray400} size={14} style={{ marginLeft: 4 }} />
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
            <Plus color={COLORS.primary} size={24} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t('mobile.chat.typeMessage')}
            placeholderTextColor={COLORS.textFaint}
            value={message}
            onChangeText={handleType}
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]} onPress={handleSend}>
            <Send color={COLORS.white} size={18} style={{ marginLeft: 2 }} />
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
                <Text style={styles.modalTitle}>{t('mobile.chat.makeOffer')}</Text>
                <TouchableOpacity onPress={() => setShowOfferModal(false)}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalLabel}>{t('mobile.chat.enterOfferAmount')}</Text>
              <TextInput
                style={styles.offerInput}
                placeholder="e.g. 5000"
                placeholderTextColor={COLORS.textFaint}
                keyboardType="numeric"
                value={offerAmount}
                onChangeText={setOfferAmount}
                autoFocus
              />
              <TouchableOpacity style={styles.submitOfferBtn} onPress={handleSendOffer}>
                <Text style={styles.submitOfferText}>{t('mobile.chat.sendOffer')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgDeep, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4, marginRight: 8 },
  headerUserInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerName: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  headerStatus: { color: COLORS.primary, fontSize: 12, fontWeight: '500' },
  headerOffline: { color: COLORS.textFaint },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  chatContainer: { padding: 16, paddingBottom: 32 },
  bubbleWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  bubbleWrapperLeft: { justifyContent: 'flex-start' },
  bubbleWrapperRight: { justifyContent: 'flex-end' },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 20 },
  bubbleLeft: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  bubbleRight: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22, color: COLORS.white },
  bubbleTextLeft: { color: '#e5e7eb' },
  bubbleTextRight: { color: COLORS.white },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
  bubbleTime: { fontSize: 11 },
  bubbleTimeLeft: { color: COLORS.textFaint },
  bubbleTimeRight: { color: 'rgba(255,255,255,0.7)' },
  failedText: { color: '#fca5a5', fontSize: 11, marginLeft: 4, fontWeight: '600' },
  
  offerCard: { marginTop: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  offerLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  offerAmount: { color: COLORS.white, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  offerBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  offerBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  badgepending: { backgroundColor: '#2563eb' },
  badgeaccepted: { backgroundColor: COLORS.primary },
  badgerejected: { backgroundColor: '#dc2626' },
  badgecountered: { backgroundColor: '#d97706' },
  offerActions: { flexDirection: 'row', gap: 8 },
  offerBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  offerBtnAccept: { backgroundColor: COLORS.primary },
  offerBtnReject: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  offerBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  orderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', paddingVertical: 10, borderRadius: 8, marginTop: 4 },
  orderBtnText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },

  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, backgroundColor: COLORS.bgDeep, borderTopWidth: 1, borderTopColor: COLORS.border },
  attachBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(26, 46, 29, 0.8)', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 22, minHeight: 44, maxHeight: 100, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, color: COLORS.white, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  sendBtnDisabled: { backgroundColor: COLORS.border, opacity: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1a2e1d', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  modalLabel: { color: COLORS.textMuted, fontSize: 14, marginBottom: 12 },
  offerInput: { backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 12, height: 56, paddingHorizontal: 16, color: COLORS.white, fontSize: 18, fontWeight: 'bold', borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  submitOfferBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitOfferText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' }
});
