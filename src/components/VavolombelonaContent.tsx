import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';

type Response = {
  // Words spoken by the congregation. Multiple entries appear when a single
  // leader cue is answered with several distinct citations (e.g. Petera).
  text: string;
  citation: string;
};

type Stanza = {
  leader: string;
  responses: Response[];
};

// Liturgical structure for "Fanekem-pinoan'ireo vavolombelona niara-belona
// tamin'ny Tompo". Manual line breaks were removed: phone widths vary
// (320–430+ dp) and reflow gives a better result on every screen.
const STANZAS: Stanza[] = [
  {
    leader:
      "Manambara ny finoantsika an'i Jesoa Kristy isika, dia araka ny teny nataon'i Jaona mpanao Batisa hoe:",
    responses: [
      {
        text:
          "Indro ny Zanak'ondrin'Andriamanitra izay manaisotra ny fahotan'izao tontolo izao",
        citation: 'Jaona 1:29',
      },
    ],
  },
  {
    leader: "sy araka ny teny nataon'i Andrea hoe:",
    responses: [
      {
        text: 'Efa nahita ny Mesia izahay',
        citation: 'Jaona 1:41',
      },
    ],
  },
  {
    leader: "sy araka ny teny nataon'i Natanaela hoe:",
    responses: [
      {
        text:
          "Raby ô, ianao no Kristy Zanak'Andriamanitra, Ianao no Mpanjakan'ny Israely",
        citation: 'Jaona 1:49',
      },
    ],
  },
  {
    leader: "sy araka ny teny nataon'ny samaritana hoe:",
    responses: [
      {
        text:
          'Ny tenanay no nandre, ka fantatray fa izy tokoa no Mpamonjy izao tontolo izao.',
        citation: 'Jaona 4:42',
      },
    ],
  },
  {
    leader: "sy araka ny teny nataon'i Petera hoe:",
    responses: [
      {
        text: "Ianao no Kristy Zanak'Andriamanitra velona.",
        citation: 'Matio 16:16',
      },
      {
        text: "Ianao no manana ny tenin'ny fiainana mandrakizay.",
        citation: 'Jaona 6:68',
      },
    ],
  },
  {
    leader: "sy araka ny teny nataon'i Tomasy hoe:",
    responses: [
      {
        text: 'Tompoko sy Andriamanitro',
        citation: 'Jaona 20:28',
      },
    ],
  },
];

// Body size drives the vertical rhythm so spacing scales with Dynamic Type.
const BODY_SIZE = 18;
const BODY_LINE_HEIGHT = 26; // ~1.44× — comfortable for short liturgical phrases.

export default function VavolombelonaContent() {
  const {theme} = useTheme();

  const textColor = theme.isDark
    ? theme.colors.readerText
    : theme.colors.textPrimary;
  const themeColor = theme.colors.accentBlue;
  const citationColor = theme.colors.textSecondary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingVertical: 4,
        },
        stanza: {
          // ~16dp at the default body size; scales naturally if the user
          // increases system font size because we don't pin it lower.
          marginBottom: BODY_SIZE * 0.9,
        },
        roleLabel: {
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginBottom: BODY_SIZE * 0.25,
        },
        roleLabelLeader: {
          color: themeColor,
        },
        roleLabelCongregation: {
          color: textColor,
        },
        leaderText: {
          fontSize: BODY_SIZE,
          lineHeight: BODY_LINE_HEIGHT,
          fontWeight: '400',
          color: textColor,
          marginBottom: BODY_SIZE * 0.5,
        },
        // The indent on the response is the second redundancy signal —
        // together with the "Fiangonana" label — so colour alone doesn't
        // carry the call/response distinction (helps accessibility).
        responseBlock: {
          paddingLeft: 14,
          marginBottom: BODY_SIZE * 0.35,
        },
        responseText: {
          fontSize: BODY_SIZE,
          lineHeight: BODY_LINE_HEIGHT,
          // Medium weight separates the response from the leader cue
          // without crossing into full bold.
          fontWeight: '500',
          color: textColor,
        },
        citation: {
          fontSize: 13,
          color: citationColor,
          textAlign: 'right',
          marginTop: 2,
        },
        amen: {
          fontSize: 24,
          fontWeight: '800',
          color: themeColor,
          textAlign: 'center',
          marginTop: BODY_SIZE * 0.5,
        },
      }),
    [textColor, themeColor, citationColor],
  );

  return (
    <View style={styles.container}>
      {STANZAS.map((stanza, index) => (
        <View key={index} style={styles.stanza}>
          <Text style={[styles.roleLabel, styles.roleLabelLeader]}>
            Mpitarika
          </Text>
          <Text style={styles.leaderText}>{stanza.leader}</Text>

          <Text style={[styles.roleLabel, styles.roleLabelCongregation]}>
            Fiangonana
          </Text>
          {stanza.responses.map((response, rIndex) => (
            <View key={rIndex} style={styles.responseBlock}>
              <Text style={styles.responseText}>{response.text}</Text>
              <Text style={styles.citation}>{response.citation}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.amen}>Amen!</Text>
    </View>
  );
}
