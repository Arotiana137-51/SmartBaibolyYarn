import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { HymnVerse } from '../hooks/useHymnsData';
import { useTheme } from '../contexts/ThemeContext';

// Hymn-specific spacing configuration
const HYMN_LINE_HEIGHT_MULTIPLIER = 1.7; // More relaxed spacing for hymns
const HYMN_STANZA_MARGIN = 20;
const HYMN_BASE_BOTTOM_PADDING = 28;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const parsed =
    normalized.length === 3
      ? normalized
          .split('')
          .map(ch => ch + ch)
          .join('')
      : normalized;

  const int = parseInt(parsed, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const FLOATING_BOTTOM_NAV_SPACER = {
  offsetFromBottom: 15,
  containerPaddingTop: 8,
  segmentHeight: 42,
  trackPaddingVertical: 4 * 2,
  extraMargin: 16,
} as const;

interface HymnReaderViewProps {
  hymnVerses: HymnVerse[];
  isLoading: boolean;
  fontScale?: number;
  onHymnLongPress?: (stanzaNumber: number, stanzaText: string) => void;
}

const HymnReaderView: React.FC<HymnReaderViewProps> = ({
  hymnVerses,
  isLoading,
  fontScale = 1,
  onHymnLongPress,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomScrollSpacer =
    Math.max(insets.bottom, 0) +
    FLOATING_BOTTOM_NAV_SPACER.offsetFromBottom +
    FLOATING_BOTTOM_NAV_SPACER.containerPaddingTop +
    FLOATING_BOTTOM_NAV_SPACER.segmentHeight +
    FLOATING_BOTTOM_NAV_SPACER.trackPaddingVertical +
    FLOATING_BOTTOM_NAV_SPACER.extraMargin;

  const bottomScrollSpacerAdjusted = Math.round(bottomScrollSpacer * 0.5) + 7;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Group hymn verses by stanza number
  const chorusLines = hymnVerses.filter(verse => verse.is_chorus);
  const stanzaOnlyLines = hymnVerses.filter(verse => !verse.is_chorus);

  const groupedHymnVerses = stanzaOnlyLines.reduce<Record<number, HymnVerse[]>>(
    (accumulator, verse) => {
      const bucket = accumulator[verse.verse_number] ?? [];
      bucket.push(verse);
      accumulator[verse.verse_number] = bucket;
      return accumulator;
    },
    {}
  );

  const hymnStanzas = Object.entries(groupedHymnVerses)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([verseNumber, stanzaVerses]) => ({
      verseNumber: Number(verseNumber),
      lines: stanzaVerses,
    }));

  const stanzaCardBackground = theme.isDark
    ? hexToRgba('#FFFFFF', 0.06)
    : hexToRgba('#000000', 0.04);

  const chorusBackground = theme.isDark
    ? hexToRgba('#FFFFFF', 0.08)
    : hexToRgba('#000000', 0.05);

  return (
    <FlatList
      data={hymnStanzas}
      keyExtractor={(item) => item.verseNumber.toString()}
      contentContainerStyle={{paddingBottom: HYMN_BASE_BOTTOM_PADDING + bottomScrollSpacerAdjusted}}
      renderItem={({ item }) => {
        const stanzaText = item.lines.map(line => line.text).join('\n');

        return (
          <View style={styles.stanzaBlock}>
            <Pressable
              style={[styles.hymnStanza, {backgroundColor: stanzaCardBackground}]}
              onLongPress={() => onHymnLongPress?.(item.verseNumber, stanzaText)}
              disabled={!onHymnLongPress}
            >
              <Text
                style={[
                  styles.hymnNumber,
                  {
                    fontSize: styles.hymnNumber.fontSize * fontScale,
                    color: theme.colors.verseNumber,
                  },
                ]}>
                {item.verseNumber}
              </Text>
              <View style={styles.hymnTextContainer}>
                {item.lines.map((line) => (
                  <Text
                    key={line.id}
                    style={[
                      styles.hymnText,
                      {
                        fontSize: styles.hymnText.fontSize * fontScale,
                        lineHeight: Math.round(
                          styles.hymnText.fontSize *
                            fontScale *
                            HYMN_LINE_HEIGHT_MULTIPLIER
                        ),
                        color: theme.colors.readerText,
                      },
                    ]}>
                    {line.text}
                  </Text>
                ))}
              </View>
            </Pressable>

            {chorusLines.length > 0 ? (
              <View style={[styles.chorusBlock, {backgroundColor: chorusBackground}]}> 
                <Text
                  style={[
                    styles.chorusLabel,
                    {
                      fontSize: styles.chorusLabel.fontSize * fontScale,
                      color: theme.colors.verseNumber,
                    },
                  ]}
                >
                  Refrain
                </Text>
                <View style={styles.chorusTextContainer}>
                  {chorusLines.map((line) => (
                    <Text
                      key={`chorus-${line.id}`}
                      style={[
                        styles.hymnText,
                        {
                          fontSize: styles.hymnText.fontSize * fontScale,
                          lineHeight: Math.round(
                            styles.hymnText.fontSize *
                              fontScale *
                              HYMN_LINE_HEIGHT_MULTIPLIER
                          ),
                          color: theme.colors.readerText,
                        },
                      ]}
                    >
                      {line.text}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        );
      }}
      style={[styles.container, { backgroundColor: theme.colors.readerBackground }]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stanzaBlock: {
    marginBottom: HYMN_STANZA_MARGIN,
  },
  hymnStanza: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  hymnNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#005a9e',
    width: 24,
  },
  hymnTextContainer: {
    flex: 1,
    paddingLeft: 8,
  },
  hymnText: {
    fontSize: 18,
    lineHeight: 32,
    color: '#1c1c1c',
  },
  chorusBlock: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  chorusLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  chorusTextContainer: {
    paddingLeft: 8,
  },
});

export default HymnReaderView;
