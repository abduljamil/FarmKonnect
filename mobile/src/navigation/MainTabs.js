import { COLORS } from '../constants/colors';
import React, { useContext, useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Store, MessageCircle, User } from 'lucide-react-native';
import { Package } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import DashboardScreen from '../screens/DashboardScreen';
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import ConversationsScreen from '../screens/chat/ConversationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import TransactionsScreen from '../screens/transactions/TransactionsScreen';
import { SocketContext } from '../contexts/SocketContext';
import { getUnreadCount } from '../services/chatService';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { t } = useTranslation();
  const socket = useContext(SocketContext);
  const insets = useSafeAreaInsets();

  // Live unread-message badge on the Chat tab — mirrors the web Navbar's
  // unreadCount pill. Re-fetches whenever a `new_message` arrives so the
  // badge updates in near real-time.
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await getUnreadCount();
        setUnread(res.data?.data?.count || 0);
      } catch {
        // Stay at last known value if the request fails (likely 401 right
        // after login — the focus refresh on ConversationsScreen will fix it).
      }
    };
    refresh();
    if (!socket) return;
    socket.on('new_message', refresh);
    socket.on('unread_count_updated', refresh);
    return () => {
      socket.off('new_message', refresh);
      socket.off('unread_count_updated', refresh);
    };
  }, [socket]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // Add the bottom safe-area inset so the bar clears the home indicator
        // on notched phones (iPhone 13 Pro etc.). The taller height + bottom
        // padding give the labels room so they're not clipped at the edge.
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopColor: COLORS.border,
          height: 74 + insets.bottom,
          paddingBottom: 14 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('mobile.tabs.home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{
          tabBarLabel: t('mobile.tabs.market'),
          tabBarIcon: ({ color, size }) => <Store color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ConversationsScreen}
        listeners={{
          // Opening the chat tab is the natural moment to assume the user
          // is going to see those messages — let ConversationsScreen take
          // care of per-conversation "mark_read" emits.
        }}
        options={{
          tabBarLabel: t('mobile.tabs.chat'),
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
          tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.danger, color: COLORS.white, fontSize: 10 },
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarLabel: t('mobile.tabs.activity'),
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('mobile.tabs.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}
