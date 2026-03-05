import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList, Pressable } from 'react-native';
import { AppMode } from '../screens/MainScreen';
import { BibleVerse } from '../hooks/useBibleData';
import { HymnVerse } from '../hooks/useHymnsData';
import {useTheme} from '../contexts/ThemeContext';
import { TEXT_STYLES, scaleFontSize } from '../constants/Typography';

interface ReaderViewProps {
  appMode: AppMode;
  verses: BibleVerse[];
  hymnVerses: HymnVerse[];
  isLoading: boolean;
  fontScale?: number;
  onVersePress?: (verse: BibleVerse) => void;
  onVerseLongPress?: (verse: BibleVerse) => void;
  onHymnLongPress?: () => void;
  selectedVerseNumber?: number | null;
  flatListRef?: React.RefObject<FlatList<any> | null>;
}

const formatBibleText = (text: string) => {
  if (typeof text !== 'string') {
    return '';
  }

  const withLineBreaks = text
    .replace(/<\s*n\s*>/gi, '\n')
    .replace(/<\s*\/\s*n\s*>/gi, '\n')
    .replace(/<\s*br\s*\/\s*>/gi, '\n')
    .replace(/<\s*br\s*>/gi, '\n')
    .replace(/<\s*\/\s*p\s*>/gi, '\n')
    .replace(/<\s*p\s*>/gi, '\n');

  const stripped = withLineBreaks.replace(/<[^>]*>/g, ' ');

  return stripped
    .replace(/\r\n/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const renderBibleLine = (line: string) => {
  const parts = line.split(/(\[[^\]]+\])/g);
  return parts
    .filter(p => p.length > 0)
    .map((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const inner = part.slice(1, -1);
        return (
          <Text key={`bible-bracket-${index}`} style={styles.bracketText}>
            {inner}
          </Text>
        );
      }
      return <Text key={`bible-text-${index}`}>{part}</Text>;
    });
};

const isBracketOnlyLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  return /^(\[[^\]]+\]\s*)+$/.test(trimmed);
};

const ReaderView: React.FC<ReaderViewProps> = ({
  appMode,
  verses,
  hymnVerses,
  isLoading,
  fontScale = 1,
  onVersePress,
  onVerseLongPress,
  onHymnLongPress,
  selectedVerseNumber,
  flatListRef,
}) => {
  const {theme} = useTheme();
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (appMode === 'bible') {
    const getItemLayout = (data: any, index: number) => ({
      length: 80, // Approximate height of each verse item
      offset: 80 * index,
      index,
    });

    return (
      <FlatList
        ref={flatListRef}
        data={verses}
        keyExtractor={(item) => item.id.toString()}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef?.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0.2,
            });
          }, 220);
        }}
        renderItem={({ item }) => {
          const formatted = formatBibleText(item.text);
          const lines = formatted.length > 0 ? formatted.split('\n') : [];
          const introLines: string[] = [];
          let i = 0;
          while (i < lines.length && isBracketOnlyLine(lines[i])) {
            introLines.push(lines[i]);
            i += 1;
          }
          const restLines = lines.slice(i);

          const isSelected =
            typeof selectedVerseNumber === 'number' &&
            item.verse_number === selectedVerseNumber;

          return (
            <Pressable
              style={[styles.bibleVerseBlock, isSelected && styles.selectedVerseBlock]}
              onPress={() => onVersePress?.(item)}
              onLongPress={() => onVerseLongPress?.(item)}
              disabled={!onVersePress && !onVerseLongPress}
            >
              {introLines.map((line, idx) => (
                <Text
                  key={`bible-intro-${item.id}-${idx}`}
                  style={[
                    TEXT_STYLES.body,
                    {
                      fontSize: scaleFontSize(TEXT_STYLES.body.fontSize, fontScale),
                      lineHeight: scaleFontSize(TEXT_STYLES.body.lineHeight, fontScale),
                      color: theme.colors.textSecondary,
                    },
                  ]}>
                  {renderBibleLine(line)}
                </Text>
              ))}

              {restLines.length > 0 ? (
                <Text
                  style={[
                    TEXT_STYLES.body,
                    {
                      fontSize: scaleFontSize(TEXT_STYLES.body.fontSize, fontScale),
                      lineHeight: scaleFontSize(TEXT_STYLES.body.lineHeight, fontScale),
                      color: theme.colors.textPrimary,
                    },
                  ]}>
                  <Text
                    style={[
                      TEXT_STYLES.verseNumber,
                      {
                        fontSize: scaleFontSize(TEXT_STYLES.verseNumber.fontSize, fontScale),
                        lineHeight: scaleFontSize(TEXT_STYLES.verseNumber.lineHeight, fontScale),
                        transform: [
                          {
                            translateY:
                              (styles.verseNumber.transform?.[0] as any)?.translateY *
                              fontScale,
                          },
                        ],
                      },
                    ]}>
                    {item.verse_number}{' '}
                  </Text>
                  {renderBibleLine(restLines[0])}
                </Text>
              ) : null}

              {restLines.slice(1).map((line, idx) => (
                <Text
                  key={`bible-rest-${item.id}-${idx}`}
                  style={[
                    TEXT_STYLES.body,
                    {
                      fontSize: scaleFontSize(TEXT_STYLES.body.fontSize, fontScale),
                      lineHeight: scaleFontSize(TEXT_STYLES.body.lineHeight, fontScale),
                      color: theme.colors.textPrimary,
                    },
                  ]}>
                  {renderBibleLine(line)}
                </Text>
              ))}
            </Pressable>
          );
        }}
        style={[styles.container, {backgroundColor: theme.colors.backgroundPrimary}]}
      />
    );
  }

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
      renderItem={({ item }) => (
        <Pressable
          style={styles.hymnStanza}
          onLongPress={onHymnLongPress}
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
                    lineHeight: styles.hymnText.lineHeight * fontScale,
                    color: theme.colors.textPrimary,
                  },
                ]}>
                {line.text}
              </Text>
            ))}
          </View>
        </Pressable>
      )}
      style={[styles.container, {backgroundColor: theme.colors.backgroundPrimary}]}
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
  placeholder: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  verseNumber: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#3A86FF',
    transform: [{translateY: -3}],
  },
  bracketText: {
    fontStyle: 'italic',
    color: '#3a3a3a',
  },
  bibleVerseBlock: {
    marginBottom: 14,
  },
  selectedVerseBlock: {
    backgroundColor: 'rgba(10, 132, 255, 0.16)',
    borderRadius: 12,
    padding: 12,
  },
  hymnStanza: {
    flexDirection: 'row',
    marginBottom: 16,
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
    lineHeight: 26,
    color: '#1c1c1c',
  },
});

export default ReaderView;
