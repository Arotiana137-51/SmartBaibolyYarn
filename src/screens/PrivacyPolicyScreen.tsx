import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {BackHandler, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTheme} from '../contexts/ThemeContext';
import {RootStackParamList} from '../navigation/RootNavigator';

export const STORAGE_KEY_PRIVACY_POLICY_ACCEPTED = 'privacy_policy_accepted_v1';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

const PrivacyPolicyScreen = ({navigation, route}: Props) => {
  const {theme} = useTheme();
  const [isAccepted, setIsAccepted] = useState(false);

  const isMandatory = route.params?.mandatory === true;

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_PRIVACY_POLICY_ACCEPTED);
        if (isMounted) {
          setIsAccepted(stored === 'true');
        }
      } catch {
        if (isMounted) {
          setIsAccepted(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isMandatory) {
      return;
    }

    const onBackPress = () => true;
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      sub.remove();
    };
  }, [isMandatory]);

  const policyText = useMemo(() => {
    return [
      'Privacy Policy (e-Baiboly)',
      '',
      'Last updated: 2026-04-12',
      '',
      'This app is a Bible and hymnal reader. It does not include in-app purchases or payments.',
      '',
      'Data collected',
      '- No account is required.',
      '- Your favorites, history, and settings are stored locally on your device.',
      '- If you use the “Report issue” feature, the app may send the reported text/reference and your comment to the developer endpoint configured in the app.',
      '',
      'How data is used',
      '- Favorites, history, and settings are used to provide personalized reading and navigation within the app.',
      '- Reported issues are used to improve app quality and fix bugs.',
      '',
      'Data security',
      '- All data is stored locally on your device and encrypted where supported.',
      '- Data transmitted for reporting is sent over HTTPS.',
      '- No personal or sensitive data is sold to third parties.',
      '',
      'Data retention and deletion',
      '- Your favorites, history, and settings are stored locally and will remain on your device until you uninstall the app or clear app data.',
      '- Reported issue data may be retained by the developer for bug fixing purposes.',
      '',
      'Your rights',
      '- You can access, modify, or delete your locally stored data at any time by clearing app data in your device settings.',
      '- You can uninstall the app at any time to remove all locally stored data.',
      '',
      'Permissions',
      '- Internet access may be used for optional features (for example, reporting).',
      '',
      'Third-party services',
      '- The app may use third-party libraries required for functionality. No advertising SDK is included by default.',
      '- Third-party libraries do not have access to your personal data beyond what is necessary for their functionality.',
      '',
      'Changes to this policy',
      '- We may update this policy. Significant changes will be notified in the app.',
      '- The last updated date at the top of this policy indicates when changes were made.',
      '',
      'Contact',
      'If you have questions, contact: arotianarandria@proton.me',
    ].join('\n');
  }, []);

  const accept = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PRIVACY_POLICY_ACCEPTED, 'true');
    } catch {
      // ignore
    }

    setIsAccepted(true);

    if (isMandatory) {
      navigation.reset({index: 0, routes: [{name: 'Home'}]});
    } else {
      navigation.goBack();
    }
  }, [isMandatory, navigation]);

  const close = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.backgroundPrimary}]}>
      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, {color: theme.colors.textPrimary}]}>Privacy Policy</Text>
          
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.backgroundSecondary,
                borderColor: theme.colors.divider,
              },
            ]}
          >
            <Text style={[styles.cardText, {color: theme.colors.textSecondary}]}>{policyText}</Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, {borderTopColor: theme.colors.divider}]}>
          {isMandatory ? (
            <Pressable
              style={[styles.primaryButton, {backgroundColor: theme.colors.accentBlue}]}
              onPress={accept}
            >
              <Text style={styles.primaryButtonText}>I agree</Text>
            </Pressable>
          ) : (
            <View style={styles.row}>
              {!isAccepted ? (
                <Pressable
                  style={[styles.primaryButton, {backgroundColor: theme.colors.accentBlue}]}
                  onPress={accept}
                >
                  <Text style={styles.primaryButtonText}>I agree</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.secondaryButton, {borderColor: theme.colors.divider}]}
                onPress={close}
              >
                <Text style={[styles.secondaryButtonText, {color: theme.colors.textPrimary}]}>Close</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 12,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PrivacyPolicyScreen;
