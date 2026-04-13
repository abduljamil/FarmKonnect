import React, { useState, useRef, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { ArrowLeft, Send, Phone, MoreVertical, Plus } from 'lucide-react-native';
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
      socket.emit('join conversation', conversationId);
      socket.on('new message', (newMsg) => {
        setChatLog((prev) => [...prev, newMsg]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      });
    }

    return () => {
      if (socket) {
        socket.emit('leave conversation', conversationId);
        socket.off('new message');
      }
    };
  }, [conversationId, socket]);

  const handleSend = async () => {
    if (!message.trim() || !conversationId) return;
    
    // Optimistic UI updates
    const tempMsg = {
      _id: Date.now().toString(),
      content: message,
      sender: user._id,
      createdAt: new Date().toISOString()
    };
    
    setChatLog([...chatLog, tempMsg]);
    setMessage('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await sendMessage(conversationId, tempMsg.content);
    } catch (err) {
      console.error('Error sending message:', err);
    }
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
            <Text style={styles.headerStatus}>Online</Text>
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
              const isMe = msg.sender === user?._id || msg.sender?._id === user?._id;
              const msgTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <View key={msg._id} style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
                  {!isMe && <Image source={{ uri: avatar }} style={styles.bubbleAvatar} />}
                  <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                    <Text style={[styles.bubbleText, isMe ? styles.bubbleTextRight : styles.bubbleTextLeft]}>{msg.content}</Text>
                    <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeRight : styles.bubbleTimeLeft]}>{msgTime}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.inputArea}>
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
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  chatContainer: { padding: 16, paddingBottom: 32 },
  dateLabelContainer: { alignSelf: 'center', backgroundColor: 'rgba(26, 46, 29, 0.8)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#224026' },
  dateLabel: { color: '#a3a3a3', fontSize: 12, fontWeight: '500' },
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
  bubbleTime: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeLeft: { color: '#6b7280' },
  bubbleTimeRight: { color: 'rgba(255,255,255,0.7)' },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, backgroundColor: '#0a110c', borderTopWidth: 1, borderTopColor: '#224026' },
  attachBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(26, 46, 29, 0.8)', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#224026' },
  input: { flex: 1, backgroundColor: 'rgba(26, 46, 29, 0.8)', borderRadius: 22, minHeight: 44, maxHeight: 100, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#224026' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  sendBtnDisabled: { backgroundColor: '#224026', opacity: 0.5 }
});
