import React, {useEffect, useState} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {DatabaseProvider, useDatabase} from './src/contexts/DatabaseContext';
import {ActivityIndicator, View, Text, StyleSheet} from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';
import {JesusNameProvider, useJesusName} from './src/contexts/JesusNameContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {STORAGE_KEY_PRIVACY_POLICY_ACCEPTED} from './src/screens/PrivacyPolicyScreen';

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
    <SafeAreaProvider>
      <ThemeProvider>
        <JesusNameProvider>
          <DatabaseProvider>
            <NavigationContainer>
              <AppContent />
            </NavigationContainer>
          </DatabaseProvider>
        </JesusNameProvider>
      </ThemeProvider>
    </SafeAreaProvider>
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
