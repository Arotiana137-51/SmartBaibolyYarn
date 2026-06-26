import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {t} from '../i18n/strings';
import {recordFatalError} from '../services/reporting/crashReporter';

// Error boundaries are the one place React still requires a class component:
// there is no hook equivalent for getDerivedStateFromError/componentDidCatch.
// This sits at the top of the tree so a render/lifecycle throw on any screen
// shows a recoverable fallback instead of taking the whole app down.

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  // Bumped on retry to force a full remount of the child subtree. Without this,
  // clearing hasError re-renders the *same* element instances, so a persistent
  // fault throws again on the very next render and the retry looks dead.
  retryKey: number;
};

// Kept self-contained on purpose: the boundary wraps the ThemeProvider, so it
// cannot read the theme. A neutral, theme-agnostic palette is used instead.
const FALLBACK_COLORS = {
  background: '#0B0B0C',
  text: '#F2F2F7',
  textSecondary: '#8E8E93',
  accent: '#007991',
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {hasError: false, retryKey: 0};

  static getDerivedStateFromError(): Partial<State> {
    return {hasError: true};
  }

  componentDidCatch(error: Error, info: {componentStack?: string}) {
    // Persist the real error + component stack so the next session (or an
    // issue report) can reveal what actually threw — production currently
    // only sees a generic JavascriptException with no details.
    recordFatalError(error, 'render', info?.componentStack);
  }

  handleRetry = () => {
    // Bump retryKey so the children remount fresh, instead of re-rendering the
    // same instances that just threw.
    this.setState(prev => ({hasError: false, retryKey: prev.retryKey + 1}));
  };

  render() {
    if (!this.state.hasError) {
      return (
        <React.Fragment key={this.state.retryKey}>
          {this.props.children}
        </React.Fragment>
      );
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('errors.fatalTitle')}</Text>
        <Text style={styles.message}>{t('errors.fatalMessage')}</Text>
        <Pressable
          style={({pressed}) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={this.handleRetry}
          hitSlop={8}>
          <Text style={styles.retryLabel}>{t('errors.fatalRetry')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: FALLBACK_COLORS.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: FALLBACK_COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: FALLBACK_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: FALLBACK_COLORS.accent,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.25,
  },
});
