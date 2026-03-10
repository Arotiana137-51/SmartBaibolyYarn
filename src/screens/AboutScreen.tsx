import React, {useMemo} from 'react';
import {Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {t} from '../i18n/strings';
import {PRIVACY_POLICY_URL} from '../constants/legal';
import {useTheme} from '../contexts/ThemeContext';
import packageJson from '../../package.json';

const AboutScreen = () => {
  const {theme} = useTheme();

  const appVersion = String((packageJson as any)?.version ?? '');

  const developerName = 'Arotiana Randrianasolo';
  const developerRole = 'Développeur';
  const contactEmail = 'arotianarandria@proton.me';
  const phoneNumber = '+261342569879';
  const mobileMoneyNumber = '+261 34 25 698 79';
  const linkedInUrl = 'https://www.linkedin.com/in/arotiana/';
  const websiteUrl = '';
  const supportUrl = '';

  const sections = useMemo(
    () => [
      {
        title: 'Développeur',
        lines: [
          developerName,
          developerRole,
          "N'hésite pas à me contacter pour les retours, bugs, ou suggestions.",
        ],
      },
      {
        title: 'Soutenir le projet',
        lines: [
          "Cette application est maintenue et améliorée sur mon temps libre.",
          "Si tu veux financer la maintenance et les mises à jour, tu peux contribuer via le lien ci-dessous.",
          `Mobile Money: ${mobileMoneyNumber}`,
        ],
      },
      {
        title: 'Informations',
        lines: [
          `Version: ${appVersion || '-'}`,
          'Disponible sur Android et iOS.',
        ],
      },
      {
        title: 'Bonnes pratiques',
        lines: [
          "Garde l'application à jour pour bénéficier des correctifs.",
          "Signale les erreurs ou incohérences via le bouton de signalement.",
          "Respecte la confidentialité: consulte la politique si nécessaire.",
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

            {section.title === 'Soutenir le projet' && canOpenUrl(supportUrl) ? (
              <Pressable
                style={[styles.primaryButton, {backgroundColor: theme.colors.accentBlue}]}
                onPress={() => openUrlSafe(supportUrl)}
              >
                <Text style={styles.primaryButtonText}>Contribuer</Text>
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
          <Text style={[styles.cardTitle, {color: theme.colors.navBackground}]}>Liens</Text>

          {contactEmail.trim() ? (
            <Pressable style={styles.linkRow} onPress={() => openEmailSafe(contactEmail)}>
              <Text style={[styles.linkText, {color: theme.colors.accentBlue}]}>
                Contacter le développeur
              </Text>
              <Text style={[styles.linkHint, {color: theme.colors.textSecondary}]}>
                {contactEmail}
              </Text>
            </Pressable>
          ) : null}

          {phoneNumber.trim() ? (
            <Pressable style={styles.linkRow} onPress={() => openPhoneSafe(phoneNumber)}>
              <Text style={[styles.linkText, {color: theme.colors.accentBlue}]}>Téléphone</Text>
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
                Site web
              </Text>
              <Text style={[styles.linkHint, {color: theme.colors.textSecondary}]}>
                {websiteUrl}
              </Text>
            </Pressable>
          ) : null}

          {canOpenUrl(PRIVACY_POLICY_URL) ? (
            <Pressable style={styles.linkRow} onPress={() => openUrlSafe(PRIVACY_POLICY_URL)}>
              <Text style={[styles.linkText, {color: theme.colors.accentBlue}]}>
                Politique de confidentialité
              </Text>
              <Text style={[styles.linkHint, {color: theme.colors.textSecondary}]}>
                Ouvrir
              </Text>
            </Pressable>
          ) : null}

          {!contactEmail.trim() && !phoneNumber.trim() && !canOpenUrl(linkedInUrl) && !canOpenUrl(websiteUrl) && !canOpenUrl(PRIVACY_POLICY_URL) ? (
            <Text style={[styles.cardText, {color: theme.colors.textSecondary}]}
            >
              Ajoute tes liens (email/site/confidentialité) dans cet écran.
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
