import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {DatabaseProvider, useDatabase} from './src/contexts/DatabaseContext';
import {ActivityIndicator, View, Text, StyleSheet} from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import {ThemeProvider, useTheme} from './src/contexts/ThemeContext';

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

  if (!isReady || !isInitialized) {
    return <SplashScreen />;
  }

  return <RootNavigator />;
};

// Main App component with providers
const App = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DatabaseProvider>
          <NavigationContainer>
            <AppContent />
          </NavigationContainer>
        </DatabaseProvider>
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
