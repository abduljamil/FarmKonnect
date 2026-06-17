import { COLORS } from '../constants/colors';
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { AuthContext } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { navigationRef } from './navigationRef';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import EmailSentScreen from '../screens/auth/EmailSentScreen';

// Main App Screens
import MainTabs from './MainTabs';
import ListingDetailScreen from '../screens/marketplace/ListingDetailScreen';
import CreateListingScreen from '../screens/marketplace/CreateListingScreen';
import EditListingScreen from '../screens/marketplace/EditListingScreen';
import MyListingsScreen from '../screens/marketplace/MyListingsScreen';
import TransactionDetailScreen from '../screens/transactions/TransactionDetailScreen';
import CreateTransactionScreen from '../screens/transactions/CreateTransactionScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ConversationsScreen from '../screens/chat/ConversationsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import PriceAlertsScreen from '../screens/profile/PriceAlertsScreen';
import SupportScreen from '../screens/profile/SupportScreen';
import MyTicketsScreen from '../screens/profile/MyTicketsScreen';
import TicketDetailScreen from '../screens/profile/TicketDetailScreen';
import PrivacySecurityScreen from '../screens/profile/PrivacySecurityScreen';
import MyReviewsScreen from '../screens/profile/MyReviewsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PriceTrendsScreen from '../screens/marketplace/PriceTrendsScreen';
import KisanScreen from '../screens/kisan/KisanScreen';
import AboutUsScreen from '../screens/static/AboutUsScreen';
import ContactUsScreen from '../screens/static/ContactUsScreen';
import PrivacyPolicyScreen from '../screens/static/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/static/TermsOfServiceScreen';
import MethodologyScreen from '../screens/static/MethodologyScreen';

const Stack = createNativeStackNavigator();

// Deep-linking config — handles BOTH the custom scheme (`farmkonnect://`)
// and the production https URLs that arrive from email links and Android
// app-links. The reset-password URL embedded in the verification email
// looks like `https://www.farmkonnect.app/reset-password/<token>` so the
// `:token` path param maps straight to ResetPasswordScreen.params.token.
const linkingConfig = {
  prefixes: [
    Linking.createURL('/'), // dev: exp://… (Expo Go)
    'farmkonnect://',
    'https://www.farmkonnect.app',
    'https://farmkonnect.app',
  ],
  config: {
    screens: {
      ResetPassword: 'reset-password/:token',
      VerifyEmail: 'verify-email/:token',
      // verify-email lives on the web side; tapping it on a device with the
      // app installed will route here so we can show a friendly screen.
      // For now we let the OS fall through to the browser if the user is
      // not signed in.
      Main: {
        screens: {
          // tab deep links if you ever need them
        },
      },
    },
  },
};

const AppNavigator = () => {
  const { user, token, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linkingConfig}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token && user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
            <Stack.Screen name="CreateListing" component={CreateListingScreen} />
            <Stack.Screen name="EditListing" component={EditListingScreen} />
            <Stack.Screen name="MyListings" component={MyListingsScreen} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
            <Stack.Screen name="CreateTransaction" component={CreateTransactionScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Conversations" component={ConversationsScreen} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="PriceAlerts" component={PriceAlertsScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
            <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
            <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="PriceTrends" component={PriceTrendsScreen} />
            <Stack.Screen name="Methodology" component={MethodologyScreen} />
            <Stack.Screen name="KisanScreen" component={KisanScreen} />
            <Stack.Screen name="AboutUs" component={AboutUsScreen} />
            <Stack.Screen name="ContactUs" component={ContactUsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            {/* Reset password is in the protected stack too so that users
                who tap a reset link while still signed in are routed
                correctly. */}
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen name="EmailSent" component={EmailSentScreen} />
            {/* Public static pages so they're reachable from SignIn /
                Welcome footer / ForgotPassword too. */}
            <Stack.Screen name="AboutUs" component={AboutUsScreen} />
            <Stack.Screen name="ContactUs" component={ContactUsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
