import React, {useEffect, useState} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {DatabaseProvider, useDatabase} from './src/contexts/DatabaseContext';
import {ActivityIndicator, View, Text, StyleSheet} from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';
import {JesusNameProvider, useJesusName} from './src/contexts/JesusNameContext';
import {CultModeProvider} from './src/contexts/CultModeContext';
import {InAppNotificationProvider} from './src/contexts/InAppNotificationContext';
import {TutorialProvider} from './src/contexts/TutorialContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEY_PRIVACY_POLICY_ACCEPTED} from './src/screens/PrivacyPolicyScreen';
import {ErrorBoundary} from './src/components/ErrorBoundary';
import {
  installGlobalErrorHandler,
  drainFatalErrorToQueue,
} from './src/services/reporting/crashReporter';

// Capture uncaught JS errors (async, timers, event handlers) before RN's
// default handler runs, so production crashes carry a real message/stack.
installGlobalErrorHandler();

// TEMP(testing): force the complete onboarding flow (color selection → basic
// navigation tutorial → Fotoam-pivavahana tutorial) on every launch. Set back
// to false before release.
const FORCE_ONBOARDING_FLOW = true;

// Splash screen component
const SplashScreen = () => (
  <View style={styles.splashContainer}>
    <ActivityIndicator size="large" color="#0000ff" />
    <Text style={styles.loadingText}>Loading Bible App...</Text>
  </View>
);

// Main App component
const AppContent = () => {
  const {isInitialized} = useDatabase();
  const {isReady} = useTheme();
  const {isReady: isJesusNameReady} = useJesusName();
  const [privacyPolicyChecked, setPrivacyPolicyChecked] = useState(false);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);

  useEffect(() => {
    // Move any crash captured on the previous run into the upload queue. The
    // existing flush (NetInfo reconnect / app foreground in MainScreen) then
    // ships it, so the real error/stack behind a production JavascriptException
    // finally becomes visible. Fire-and-forget; never throws.
    drainFatalErrorToQueue();
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_PRIVACY_POLICY_ACCEPTED);
        if (isMounted) {
          setPrivacyPolicyAccepted(stored === 'true');
        }
      } catch {
        if (isMounted) {
          setPrivacyPolicyAccepted(false);
        }
      } finally {
        if (isMounted) {
          setPrivacyPolicyChecked(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const providersReady = isReady && isJesusNameReady && isInitialized;

  if (!providersReady || !privacyPolicyChecked) {
    return <SplashScreen />;
  }

  if (FORCE_ONBOARDING_FLOW) {
    return <RootNavigator initialRouteName="Personalization" forceFirstRun />;
  }

  return (
    <RootNavigator
      initialRouteName={privacyPolicyAccepted ? 'Home' : 'PrivacyPolicy'}
      privacyPolicyMandatory={!privacyPolicyAccepted}
    />
  );
};

// Main App component with providers
const App = () => {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <ThemeProvider>
            <JesusNameProvider>
              <DatabaseProvider>
                <CultModeProvider>
                  <InAppNotificationProvider>
                    <TutorialProvider>
                      <NavigationContainer>
                        <AppContent />
                      </NavigationContainer>
                    </TutorialProvider>
                  </InAppNotificationProvider>
                </CultModeProvider>
              </DatabaseProvider>
            </JesusNameProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default App;
