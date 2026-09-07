import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  BackHandler,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

  // Agree button mirrors whichever language section is currently in view:
  // "Ekeko" while scrolled through the MG card, "I agree" once the EN card
  // reaches the top of the viewport. enCardY is the EN card's offset within
  // the scroll content (measured once via onLayout); Infinity keeps the MG
  // label until that measurement lands.
  const enCardY = useRef(Infinity);
  const [isOnEnglishSection, setIsOnEnglishSection] = useState(false);
  const agreeLabel = isOnEnglishSection ? 'I agree' : 'Ekeko';
  const declineLabel = isOnEnglishSection ? 'Decline' : 'Tsy manaiky';

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsOnEnglishSection(e.nativeEvent.contentOffset.y >= enCardY.current);
  }, []);

  // Mandatory gate only (first run) — the EDPB standard is that refusing must
  // be as easy as accepting, so a lone Accept button is a dark pattern. There
  // is no OS API on either platform for an app to uninstall or force-close
  // itself: Android can pop its own exit, iOS has nothing at all. So Decline
  // means "block access" everywhere, plus a real exit on Android; on iOS we
  // can only tell the user how to leave on their own.
  const [showDeclineNotice, setShowDeclineNotice] = useState(false);
  const decline = useCallback(() => {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
      return;
    }
    setShowDeclineNotice(true);
  }, []);

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

  // Malagasy section is a draft placeholder — legal copy, but still the
  // user's language to review and correct, same as every other MG string in
  // this app. Kept structurally parallel to the English section below so the
  // two stay easy to compare/update together.
  const policyTextMg = useMemo(() => {
    return [
      'Faneken\'ny e-Baiboly hiaro ny tsiambaratelonao',
      '',
      'Nohavaozina farany: 2026-09-01',
      '',
      "Rindrankajy famakiana ny Baiboly sy ny fihirana ity. Zaraina maimaimpoana ary tsy misy zavatra amidy ao anatin'ny rindrankajy.",
      '',

      '## Fizakan-tena',
      "- Ny e-Baiboly dia karakaraina sy zaraina an-tenany, tsy miankina amin'olon-kafa.",
      "- Azon'ny OLONA REHETRA ampiasaina ny e-Baiboly.",
      "- Tsy manavaka olona na antokom-pinoana ampiasa azy ary azonao ampiasaina any amin'ny toerana rehetra ny e-Baiboly.",
      "- Manaja sy manaraka ny rafitra sy ny fahefana misy any amin'ny firenena tsirairay ampiasana azy ny e-Baiboly (Hetra,haba...) kanefa tsy mifamatotra amina governemanta na antoko politika na firehan-kevitra.",
      "- Ny tanjony tokana dia ny fizarana an-kalalahana'ny soratra masina, ho an'ny olona rehetra.",
      '',
      '## Ny données angonina',
      "- Tsy mila kaonty ianao,  tsy mitahiry na maka \"informations\"  momba anao izahay , hajainay ny \"vie privée anao\" ",
      "- Ny ankafizinao, ny tantaram-pamakianao, ary ny fandrindrana dia tehirizina ao amin'ny finday ihany. Tsy misy makany amin'ny serveur ny e-Baiboly",
      "- Rehefa mampiasa ny teboka \"Manao fitaterana izay diso\" ihany ianao, vao mety halefan'ny rindrankajy any amin'ny \"developeur\" ny hevitrao. Isaorana mialoha noho izany ianao.",
      "- Tsy ampiasaina anaovana \"entrainement na IA\" ny données anao.",
      '',
      // DRAFT MG translation of the Cloudflare/reporting disclosure below —   
      // technical/legal wording, please review before shipping.
      "## Ny fitaovana fanaovana fitaterana sy Cloudflare",
      "Arakaraky ny safidinao ihany ny fampiasana ny teboka \"Manao fitaterana izay diso\". Rehefa mandefa fitaterana ianao, dia alefan'ny rindrankajy amin'ny alalan'ny HTTPS ho any amin'ny \"endpoint\" an'ny \"developeur\", izay mitoetra ao amin'ny Cloudflare Workers.",
      "- Ny fitaterana dia natao ho an'ny fanitsiana lahatsoratra. Tsy mila kaonty ianao ary tsy mangataka ny anaranao, ny mailakao, ny laharana finday, na inona na inona famantarana manokana mivantana rehefa mandefa fitaterana ianao.",
      '',
      "## Fomba fampiasana ny données",
      "- Ny ankafizinao, ny tantara, ary ny fandrindrana dia ampiasaina hanomezana traikefa famakiana sy fitetezana manokana ao anatin'ny rindrankajy.",
      "- Ny fitaterana izay diso voaray dia ampiasaina hanatsarana ny kalitaon'ny rindrankajy sy hanitsiana izay diso.",
      '',
      "## Fiarovana ny données",
      "- Ny données rehetra dia tehirizina ao amin'ny finday ary voaaro raha misy izany\"(encrypted)\".",
      "- Ny données alefa ho an'ny fitanterana izay diso dia mandeha amin'ny alalan'ny HTTPS.",
      "- Tsy misy données manokana na saro-pady amidy amin'ny olona ivelan'ny e-Baiboly.",
      '',
      "## Fitehirizana sy famafana ny données",
      "- Ny ankafizinao, ny tantara, ary ny fandrindrana dia mijanona ao amin'ny finday mandra-panesoranao ny rindrankajy na famafana ny angon-drindrankajy.",
      "- Ny angon'ny fitaterana izay diso dia mety hotehirizin'ny \"developeur\" mba hanitsiana ny olana.",
      '',
      '## Ny zonao',
      "- Azonao jerena, ovaina, na fafana ny données tehirizina ao amin'ny finday, amin'ny alalan'ny famafana ny angon-drindrankajy ao amin'ny parametres ny finday.",
      "- Azonao esorina ny rindrankajy amin'ny fotoana rehetra mba hanesorana ny données rehetra tehirizina ao amin'ny finday.",
      '',
      "## Fahazoan-dalana",
      "- Ny fifandraisana Internet dia mety ampiasaina ho an'ny endri-drindrankajy (ohatra: ny fitaterana).",
      "- Ny rindrankajy dia mety mangataka fahazoan-dalana hampiseho fampahatsiarovana \"notifications\" (\"Oh:Ora famakiana tiana\") — angataina izany raha alefanao io endri-drindrankajy tsy an-tery io.Tsy misy données alefa na angonina.",
      '',
      "## Tolotra avy amin'ny olona ivelan'ny e-Baiboly",
      "- Ny rindrankajy dia mety mampiasa tahirin-kevitra avy amin'ny olona ivelan'ny e-Baiboly ilaina amin'ny fiasany. Tsy misy SDK dob ampiasaina.",
      "- Ny tahirin-kevitra avy amin'ny olona ivelan'ny e-Baiboly dia tsy afaka mahazo ny donnéeso manokana ankoatra izay ilaina amin'ny fiasany.",
      '',
      '## Fanovana ity politika ity',
      "- Mety hohavaozinay ity politika ity. Ny fanovana lehibe dia hampahafantarina ao anatin'ny rindrankajy.",
      "- Ny daty voalaza eo ambony dia manondro ny fotoana nanaovana ny fanovana farany.",
      '',
      '## Fifandraisana',
      'Raha manana fanontaniana ianao, mailaka: arotianarandria@proton.me',
    ];
  }, []);

  const policyTextEn = useMemo(() => {
    return [
      'Privacy Policy (e-Baiboly)',
      '',
      'Last updated: 2026-09-01',
      '',
      'This app is a Bible and hymnal reader. It does not include in-app purchases or payments.',
      '',
      '## Independence',
      '- e-Baiboly is developed and distributed independently, not dependent on any outside third party.',
      '- e-Baiboly can be used by EVERYONE. It is not affiliated with any faith community or religious organization.',
      '- It does not discriminate against any person or faith community who uses it, and it can be used anywhere.',
      '- It respects and complies with the laws and authorities of each country it is used in (taxes, duties, etc.), but is not affiliated with any government, political party, or political movement.',
      '- Its sole purpose is the free distribution of scripture, for everyone.',
      '',
      '## Data collected',
      '- No account is required. We respect your privacy',
      '- Your favorites, history, and settings are stored locally on your device.',
      '- If you use the “Report issue” feature, the app may send the reported text/reference and your comment to the developer endpoint configured in the app.',
      '',
      '## Issue Reporting and Cloudflare',
      'The "Report issue" feature is optional. When you submit a report, the app sends your report over HTTPS to a developer endpoint hosted on Cloudflare Workers.',
      '- Issue reports are intended for anonymous typographical/content corrections. No account is required and the app does not ask for your name, email address, phone number, or any other direct personal identifier when you submit a report.',
      '',
      '## How data is used',
      '- Favorites, history, and settings are used to provide personalized reading and navigation within the app.',
      '- Reported issues are used to improve app quality and fix bugs.',
      '',
      '## Data security',
      '- All data is stored locally on your device and encrypted where supported.',
      '- Data transmitted for reporting is sent over HTTPS.',
      '- No personal or sensitive data is sold to third parties.',
      '',
      '## Data retention and deletion',
      '- Your favorites, history, and settings are stored locally and will remain on your device until you uninstall the app or clear app data.',
      '- Reported issue data may be retained by the developer for bug fixing purposes.',
      '',
      '## Your rights',
      '- You can access, modify, or delete your locally stored data at any time by clearing app data in your device settings.',
      '- You can uninstall the app at any time to remove all locally stored data.',
      '',
      '## Permissions',
      '- Internet access may be used for optional features (for example, reporting).',
      '- The app may request notification permission to show a reminder ("Ora famakiana tiana" / preferred reading-time reminder). This is only requested if you turn that optional feature on. The reminder is delivered entirely on your device — nothing is collected or transmitted for it.',
      '',
      '## Third-party services',
      '- The app may use third-party libraries required for functionality. No advertising SDK is included by default.',
      '- Third-party libraries do not have access to your personal data beyond what is necessary for their functionality.',
      '',
      '## Changes to this policy',
      '- We may update this policy. Significant changes will be notified in the app.',
      '- The last updated date at the top of this policy indicates when changes were made.',
      '',
      '## Contact',
      'If you have questions, contact: arotianarandria@proton.me',
    ];
  }, []);

  const renderPolicyLines = (lines: string[], emphasisColor: string) =>
    lines.map((line, index) => {
      if (index === 0) {
        return (
          <Text key={index} style={[styles.policyTitle, {color: emphasisColor}]}>
            {line}
            {'\n'}
          </Text>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <Text key={index} style={[styles.policySectionHeader, {color: emphasisColor}]}>
            {line.slice(3)}
            {'\n'}
          </Text>
        );
      }
      const isMeta = line.startsWith('Nohavaozina farany:') || line.startsWith('Last updated:');
      if (isMeta) {
        return (
          <Text key={index} style={styles.policyMeta}>
            {line}
            {'\n'}
          </Text>
        );
      }
      const isBullet = line.startsWith('- ');
      const displayLine = isBullet ? `• ${line.slice(2)}` : line;
      return (
        <Text key={index}>
          {displayLine}
          {'\n'}
        </Text>
      );
    });

  const accept = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PRIVACY_POLICY_ACCEPTED, 'true');
    } catch {
      // ignore
    }

    setIsAccepted(true);

    if (isMandatory) {
      navigation.reset({index: 0, routes: [{name: 'Personalization', params: {firstRun: true}}]});
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
          onScroll={handleScroll}
          scrollEventThrottle={32}
        >
          <Text style={[styles.title, {color: theme.colors.textPrimary}]}>Politique de confidentialité</Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.backgroundSecondary,
                borderColor: theme.colors.divider,
              },
            ]}
          >
            <Text style={[styles.langBadge, {color: theme.colors.accentBlue}]}>MG</Text>
            <Text style={[styles.cardText, {color: theme.colors.textSecondary}]}>
              {renderPolicyLines(policyTextMg, theme.colors.textPrimary)}
            </Text>
          </View>

          <View
            onLayout={e => {
              enCardY.current = e.nativeEvent.layout.y;
            }}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.backgroundSecondary,
                borderColor: theme.colors.divider,
              },
            ]}
          >
            <Text style={[styles.langBadge, {color: theme.colors.accentBlue}]}>EN</Text>
            <Text style={[styles.cardText, {color: theme.colors.textSecondary}]}>
              {renderPolicyLines(policyTextEn, theme.colors.textPrimary)}
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, {borderTopColor: theme.colors.divider}]}>
          {isMandatory ? (
            <>
              {showDeclineNotice ? (
                // PLACEHOLDER MG/EN copy — needs the app's own wording, not mine.
                <Text style={[styles.declineNotice, {color: theme.colors.textSecondary}]}>
                  Mila manaiky ianao vao afaka mampiasa ny e-Baiboly. Azonao
                  esorina (uninstall) ny rindrankajy raha tsy te-hanaiky ianao.
                  {'\n'}
                  You need to accept to use e-Baiboly. You can uninstall the
                  app yourself if you'd rather not continue.
                </Text>
              ) : null}
              <View style={styles.row}>
                <Pressable
                  style={[styles.primaryButton, {backgroundColor: theme.colors.accentBlue}]}
                  onPress={accept}
                >
                  <Text style={styles.primaryButtonText}>{agreeLabel}</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, {borderColor: theme.colors.divider}]}
                  onPress={decline}
                >
                  <Text style={[styles.secondaryButtonText, {color: theme.colors.textPrimary}]}>
                    {declineLabel}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              {!isAccepted ? (
                <Pressable
                  style={[styles.primaryButton, {backgroundColor: theme.colors.accentBlue}]}
                  onPress={accept}
                >
                  <Text style={styles.primaryButtonText}>{agreeLabel}</Text>
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
    padding: 18,
    marginBottom: 16,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 6,
  },
  langBadge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    backgroundColor: 'rgba(0, 102, 204, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 10,
    overflow: 'hidden',
  },
  policyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  policySectionHeader: {
    fontSize: 15,
    fontWeight: '700',
  },
  policyMeta: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
  },
  declineNotice: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
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
