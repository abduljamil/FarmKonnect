import { createNavigationContainerRef } from '@react-navigation/native';

// Imperative navigation handle — needed because push-tap handling fires
// from a global Notifications listener in App.js (outside the navigator's
// own React tree, so the useNavigation hook isn't available).
export const navigationRef = createNavigationContainerRef();

// Routes a push notification's `data` payload to the right screen.
// Payload shapes are set in backend/services/pushService.js (and the call
// sites in alertService / socket.js / paymentController). Anything we don't
// recognise just opens the Notifications screen.
export function navigateFromPush(data) {
  if (!navigationRef.isReady() || !data) return;
  switch (data.type) {
    case 'price_alert':
      navigationRef.navigate('Notifications');
      return;
    case 'chat':
      navigationRef.navigate('ChatScreen', { conversationId: data.conversationId });
      return;
    case 'order':
      navigationRef.navigate('TransactionDetail', { id: data.transactionId });
      return;
    default:
      navigationRef.navigate('Notifications');
  }
}
