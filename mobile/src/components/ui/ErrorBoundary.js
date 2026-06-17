import { COLORS } from '../../constants/colors';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Top-level error boundary. Without this, any uncaught render error in a screen
// (e.g. a malformed API response that several screens read optimistically)
// crashes the whole app to a blank white screen with no way to recover.
// We catch it, log it (kept in release via babel's console exclude list), and
// offer a "Try again" reset. Strings are plain English to avoid depending on
// i18n inside the failure path.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info?.componentStack);
  }

  handleReset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <Text style={styles.emoji}>🌾</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            The app hit an unexpected error. You can try again — if it keeps
            happening, please restart the app.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});
