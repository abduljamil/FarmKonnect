import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Store, MessageCircle, User, Settings } from 'lucide-react-native';
import DashboardScreen from '../screens/DashboardScreen';
import MarketplaceScreen from '../screens/marketplace/MarketplaceScreen';
import ConversationsScreen from '../screens/chat/ConversationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import TransactionsScreen from '../screens/transactions/TransactionsScreen';
import { useTranslation } from 'react-i18next';
import { ShoppingBag } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#0f1a12', 
          borderTopColor: '#224026',
          height: 65,
          paddingBottom: 10,
          paddingTop: 10
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{
          tabBarLabel: 'Market',
          tabBarIcon: ({ color, size }) => <Store color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ConversationsScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarLabel: 'Activity',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}
