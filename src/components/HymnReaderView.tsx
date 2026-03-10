import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { HymnVerse } from '../hooks/useHymnsData';
import { useTheme } from '../contexts/ThemeContext';

// Hymn-specific spacing configuration
const HYMN_LINE_HEIGHT_MULTIPLIER = 1.7; // More relaxed spacing for hymns
const HYMN_STANZA_MARGIN = 20;

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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Group hymn verses by stanza number
  const groupedHymnVerses = hymnVerses.reduce<Record<number, HymnVerse[]>>(
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

  return (
    <FlatList
      data={hymnStanzas}
      keyExtractor={(item) => item.verseNumber.toString()}
      renderItem={({ item }) => {
        const stanzaText = item.lines.map(line => line.text).join('\n');

        return (
          <Pressable
            style={styles.hymnStanza}
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
  hymnStanza: {
    flexDirection: 'row',
    marginBottom: HYMN_STANZA_MARGIN,
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
});

export default HymnReaderView;
