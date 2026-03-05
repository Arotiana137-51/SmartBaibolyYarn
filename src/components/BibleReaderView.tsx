import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Platform } from 'react-native';
import { BibleVerse } from '../hooks/useBibleData';
import { useTheme } from '../contexts/ThemeContext';
import { TEXT_STYLES, scaleFontSize } from '../constants/Typography';
import { renderBibleLine, processNTags, processBibleTextWithMetadata } from '../utils/bibleTextUtils';

// Bible-specific spacing configuration
const BIBLE_VERSE_LINE_HEIGHT_MULTIPLIER = 1.6;
const BIBLE_VERSE_BLOCK_MARGIN = 18;

interface BibleReaderViewProps {
  verses: BibleVerse[];
  isLoading: boolean;
  fontScale?: number;
  onVersePress?: (verse: BibleVerse) => void;
  onVerseLongPress?: (verse: BibleVerse) => void;
  selectedVerseNumber?: number | null;
  flatListRef?: React.RefObject<FlatList<any> | null>;
}

const BibleReaderView: React.FC<BibleReaderViewProps> = ({
  verses,
  isLoading,
  fontScale = 1,
  onVersePress,
  onVerseLongPress,
  selectedVerseNumber,
  flatListRef,
}) => {
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
        // Process <n> tags first, then format the text with metadata
        const processedText = processNTags(item.text);
        const { lines, italicLines } = processBibleTextWithMetadata(processedText);

        const isSelected =
          typeof selectedVerseNumber === 'number' &&
          item.verse_number === selectedVerseNumber;

        const verseFontSize = scaleFontSize(TEXT_STYLES.body.fontSize, fontScale);
        const verseLineHeight = Math.round(verseFontSize * BIBLE_VERSE_LINE_HEIGHT_MULTIPLIER);

        return (
          <Pressable
            style={[styles.bibleVerseBlock, isSelected && styles.selectedVerseBlock]}
            onPress={() => onVersePress?.(item)}
            onLongPress={() => onVerseLongPress?.(item)}
            disabled={!onVersePress && !onVerseLongPress}
          >
            <Text
              style={[
                TEXT_STYLES.body,
                {
                  fontSize: verseFontSize,
                  lineHeight: verseLineHeight,
                  textAlign: 'justify',
                  color: theme.colors.textPrimary,
                  ...(Platform.OS === 'android'
                    ? { includeFontPadding: true }
                    : null),
                },
              ]}
            >
              <Text
                style={[
                  TEXT_STYLES.verseNumber,
                  {
                    fontSize: scaleFontSize(TEXT_STYLES.verseNumber.fontSize, fontScale),
                    lineHeight: verseLineHeight,
                    transform: [
                      {
                        translateY:
                          (styles.verseNumber.transform?.[0] as any)?.translateY * fontScale,
                      },
                    ],
                  },
                ]}
              >
                {item.verse_number}{' '}
              </Text>

              {lines.map((line, idx) => {
                const isBlockItalic = italicLines.has(idx);
                return (
                  <Text
                    key={`bible-line-${item.id}-${idx}`}
                    style={
                      isBlockItalic
                        ? { color: theme.colors.textWatermark, fontStyle: 'italic', lineHeight: verseLineHeight }
                        : { lineHeight: verseLineHeight }
                    }
                  >
                    {idx === 0 ? '' : '\n'}
                    {renderBibleLine(line, { lineHeight: verseLineHeight })}
                  </Text>
                );
              })}
            </Text>
          </Pressable>
        );
      }}
      style={[styles.container, { backgroundColor: theme.colors.backgroundPrimary }]}
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
  verseNumber: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#3A86FF',
    transform: [{ translateY: -3 }],
  },
  bracketText: {
    fontStyle: 'italic',
    color: '#3a3a3a',
  },
  bibleVerseBlock: {
    marginBottom: BIBLE_VERSE_BLOCK_MARGIN,
  },
  selectedVerseBlock: {
    backgroundColor: 'rgba(10, 132, 255, 0.16)',
    borderRadius: 12,
    padding: 12,
  },
});

export default BibleReaderView;
