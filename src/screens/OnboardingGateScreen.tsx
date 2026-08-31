import React, {useEffect} from 'react';
import {BackHandler, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../contexts/ThemeContext';
import {markTutorialDone} from '../contexts/TutorialContext';
import {ONBOARDING_ID, CULT_TUTORIAL_ID} from '../tutorials/registry';
import type {RootStackParamList} from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// First-run step between color selection (Personalization) and Home. Asks
// whether the user already knows the app before running the tutorial
// succession (onboarding → Fotoam-pivavahana, chained in MainScreen).
// Notification permission is NOT asked here — it's asked contextually by
// ReadingReminderScreen the moment the user actually enables a reminder slot,
// so the OS prompt is self-explanatory instead of a cold, unexplained ask.
const OnboardingGateScreen = () => {
  const {theme, primaryColor} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const accent = primaryColor ?? theme.colors.navBackground;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const goHome = () => navigation.reset({index: 0, routes: [{name: 'Home'}]});

  const skipTutorial = () => {
    // Skip the whole succession, not just the main tutorial — onboarding →
    // cult chains automatically once started (see MainScreen), so both must
    // be stamped done up front.
    markTutorialDone(ONBOARDING_ID);
    markTutorialDone(CULT_TUTORIAL_ID);
    goHome();
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, {backgroundColor: theme.colors.backgroundPrimary}]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
            Efa mahay mampiasa ny appli ve ianao?
          </Text>
          <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
            Azonao ialana ny fampianarana.
          </Text>

          <Pressable
            onPress={skipTutorial}
            style={[styles.primaryButton, {backgroundColor: accent}]}
            accessibilityRole="button">
            <Text style={styles.primaryButtonText}>Ampiasa avy hatrany</Text>
          </Pressable>

          <Pressable
            onPress={goHome}
            style={[styles.secondaryButton, {borderColor: accent}]}
            accessibilityRole="button">
            <Text style={[styles.secondaryButtonText, {color: accent}]}>Tsia, asehoy ahy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 32,
  },
  content: {width: '100%', maxWidth: 480, alignSelf: 'center'},
  title: {fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 24},
  subtitle: {fontSize: 15, textAlign: 'center', marginTop: 10, marginBottom: 28},
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {fontSize: 16, fontWeight: '700'},
});

export default OnboardingGateScreen;
