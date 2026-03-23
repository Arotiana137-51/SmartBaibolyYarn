import React, {useMemo} from 'react';
import {Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t} from '../i18n/strings';
import {PRIVACY_POLICY_URL} from '../constants/legal';
import {useTheme, useLowEndMode} from '../contexts/ThemeContext';
import packageJson from '../../package.json';

const AboutScreen = () => {
  const {theme} = useTheme();
  const { isLowEndMode, enableLowEndMode, disableLowEndMode } = useLowEndMode();

  const appVersion = String((packageJson as any)?.version ?? '');

  const developerName = 'Arotiana Randrianasolo';
  const developerRole = t('about.developerRole');
  const contactEmail = 'arotianarandria@proton.me';
  const phoneNumber = '+261342569879';
  const mobileMoneyNumber = '+261 34 25 698 79';
  const linkedInUrl = 'https://www.linkedin.com/in/arotiana/';
  const websiteUrl = '';
  const supportUrl = '';

  const sections = useMemo(
    () => [
      {
        title: t('about.sectionDeveloper'),
        lines: [
          developerName,
          developerRole,
          t('about.developerLine3'),
        ],
      },
      {
        title: t('about.sectionSupport'),
        lines: [
          t('about.supportLine1'),
          t('about.supportLine2'),
          `Mobile Money: ${mobileMoneyNumber}`,
        ],
      },
      {
        title: t('about.sectionInfo'),
        lines: [
          `Version: ${appVersion || '-'}`,
          t('about.infoLinePlatforms'),
        ],
      },
      {
        title: t('about.sectionBestPractices'),
        lines: [
          t('about.bestPracticeLine1'),
          t('about.bestPracticeLine2'),
          t('about.bestPracticeLine3'),
        ],
      },
    ],
    [appVersion, developerName, developerRole, theme.isDark]
  );

  const canOpenUrl = (url: string) => typeof url === 'string' && url.trim().length > 0;

  const openUrlSafe = async (url: string) => {
    if (!canOpenUrl(url)) {
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      return;
    }
  };

  const openEmailSafe = async (email: string) => {
    if (!email.trim()) {
      return;
    }
    await openUrlSafe(`mailto:${email}`);
  };

  const openPhoneSafe = async (phone: string) => {
    if (!phone.trim()) {
      return;
    }
    await openUrlSafe(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.backgroundPrimary}]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
          {t('menu.about')}
        </Text>

        {sections.map(section => (
          <View
            key={section.title}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.backgroundSecondary,
                borderColor: theme.colors.divider,
              },
            ]}
          >
            <Text style={[styles.cardTitle, {color: theme.colors.navBackground}]}>
              {section.title}
            </Text>
            {section.lines.map((line, idx) => (
              <Text
                key={`${section.title}-${idx}`}
                style={[styles.cardText, {color: theme.colors.textSecondary}]}
              >
                {line}
              </Text>
            ))}

            {section.title === t('about.sectionSupport') && canOpenUrl(supportUrl) ? (
              <Pressable
                style={[styles.primaryButton, {backgroundColor: theme.colors.accentBlue}]}
                onPress={() => openUrlSafe(supportUrl)}
              >
                <Text style={styles.primaryButtonText}>{t('about.contribute')}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.backgroundSecondary,
              borderColor: theme.colors.divider,
            },
          ]}
        >
          <Text style={[styles.cardTitle, {color: theme.colors.navBackground}]}>{t('about.links')}</Text>

          <Pressable
            style={styles.toggleRow}
            onPress={() => {
              if (isLowEndMode) {
                disableLowEndMode();
              } else {
                enableLowEndMode();
              }
            }}
          >
            <Switch
              value={isLowEndMode}
              onValueChange={(value) => {
                if (value) {
                  enableLowEndMode();
                } else {
                  disableLowEndMode();
                }
              }}
              trackColor={{ false: '#767577', true: theme.colors.accentBlue }}
              thumbColor={isLowEndMode ? '#FFFFFF' : '#F4F3F4'}
            />
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.linkText, {color: theme.colors.accentBlue}]}>
                Ho an'ny finday somary miadana
              </Text>
              <Text style={[styles.linkHint, {color: theme.colors.textSecondary}]}>
                Tsy mandeha haingana ny telefonanao? Alefaso ity
              </Text>
            </View>
          </Pressable>

          {contactEmail.trim() ? (
            <Pressable style={styles.linkRow} onPress={() => openEmailSafe(contactEmail)}>
              <Text style={[styles.linkText, {color: theme.colors.accentBlue}]}>
                {t('about.contactDeveloper')}
              </Text>
              <Text style={[styles.linkHint, {color: theme.colors.textSecondary}]}>
                {contactEmail}
              </Text>
            </Pressable>
          ) : null}

          {phoneNumber.trim() ? (
            <Pressable style={styles.linkRow} onPress={() => openPhoneSafe(phoneNumber)}>
              <Text style={[styles.linkText, {color: theme.colors.accentBlue}]}>{t('about.phone')}</Text>
              <Text style={[styles.linkHint, {color: theme.colors.textSecondary}]}>
                {mobileMoneyNumber}
              </Text>
            </Pressable>
          ) : null}

          {canOpenUrl(linkedInUrl) ? (
            <Pressable style={styles.linkRow} onPress={() => openUrlSafe(linkedInUrl)}>
              <Text style={[styles.linkText, {color: theme.colors.accentBlue}]}>LinkedIn</Text>
              <Text style={[styles.linkHint, {color: theme.colors.textSecondary}]}>
                {linkedInUrl}
              </Text>
            </Pressable>
          ) : null}

          {canOpenUrl(websiteUrl) ? (
            <Pressable style={styles.linkRow} onPress={() => openUrlSafe(websiteUrl)}>
              <Text style={[styles.linkText, {color: theme.colors.accentBlue}]}>
                {t('about.website')}
              </Text>
              <Text style={[styles.linkHint, {color: theme.colors.textSecondary}]}>
                {websiteUrl}
              </Text>
            </Pressable>
          ) : null}

          {canOpenUrl(PRIVACY_POLICY_URL) ? (
            <Pressable style={styles.linkRow} onPress={() => openUrlSafe(PRIVACY_POLICY_URL)}>
              <Text style={[styles.linkText, {color: theme.colors.accentBlue}]}>
                {t('about.privacyPolicy')}
              </Text>
              <Text style={[styles.linkHint, {color: theme.colors.textSecondary}]}>
                {t('about.open')}
              </Text>
            </Pressable>
          ) : null}

          {!contactEmail.trim() && !phoneNumber.trim() && !canOpenUrl(linkedInUrl) && !canOpenUrl(websiteUrl) && !canOpenUrl(PRIVACY_POLICY_URL) ? (
            <Text style={[styles.cardText, {color: theme.colors.textSecondary}]}
            >
              {t('about.addLinksHint')}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.footer, {color: theme.colors.textSecondary}]}>
          {`© ${new Date().getFullYear()} ${developerName}`}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  primaryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  linkRow: {
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
  },
  linkHint: {
    marginTop: 2,
    fontSize: 12,
  },
  footer: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 12,
  },
});

export default AboutScreen;
