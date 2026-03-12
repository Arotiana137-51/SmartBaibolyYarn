import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Platform } from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { BibleVerse } from '../hooks/useBibleData';
import { useTheme } from '../contexts/ThemeContext';
import { TEXT_STYLES, scaleFontSize } from '../constants/Typography';
import { renderBibleLine, processBibleTextWithMetadataForReader } from '../utils/bibleTextUtils';

const BIBLE_VERSE_LINE_HEIGHT_MULTIPLIER = 1.3;
const BIBLE_VERSE_BLOCK_MARGIN = 7;
const BIBLE_BASE_BOTTOM_PADDING = 28;

const FLOATING_BOTTOM_NAV_SPACER = {
  offsetFromBottom: 15,
  containerPaddingTop: 8,
  segmentHeight: 42,
  trackPaddingVertical: 4 * 2,
  extraMargin: 16,
} as const;

const VerseItem = React.memo(
  ({
    item,
    theme,
    fontScale,
    selectedVerseNumber,
    onVersePress,
    onVerseLongPress,
  }: {
    item: BibleVerse;
    theme: any;
    fontScale: number;
    selectedVerseNumber?: number | null;
    onVersePress?: (verse: BibleVerse) => void;
    onVerseLongPress?: (verse: BibleVerse) => void;
  }) => {
    const { lines, italicLines } = processBibleTextWithMetadataForReader(item.text);

    const isSelected =
      typeof selectedVerseNumber === 'number' && item.verse_number === selectedVerseNumber;

    const verseFontSize = scaleFontSize(TEXT_STYLES.body.fontSize, fontScale);
    const verseLineHeight = Math.round(verseFontSize * BIBLE_VERSE_LINE_HEIGHT_MULTIPLIER) + 3;

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
              color: theme.colors.readerText,
              ...(Platform.OS === 'android' ? { includeFontPadding: true } : null),
            },
          ]}
        >
          <Text
            style={[
              TEXT_STYLES.verseNumber,
              {
                fontSize: scaleFontSize(TEXT_STYLES.verseNumber.fontSize, fontScale),
                lineHeight: verseLineHeight,
                color: theme.colors.verseNumber,
                transform: [
                  {
                    translateY: (styles.verseNumber.transform?.[0] as any)?.translateY * fontScale,
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
                    ? {
                        color: theme.colors.textWatermark,
                        fontStyle: 'italic',
                        lineHeight: verseLineHeight,
                      }
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
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.text === next.item.text &&
    prev.item.verse_number === next.item.verse_number &&
    prev.fontScale === next.fontScale &&
    prev.selectedVerseNumber === next.selectedVerseNumber &&
    prev.theme.colors.textPrimary === next.theme.colors.textPrimary &&
    prev.theme.colors.textWatermark === next.theme.colors.textWatermark
);

interface BibleReaderViewProps {
  verses: BibleVerse[];
  isLoading: boolean;
  fontScale?: number;
  onVersePress?: (verse: BibleVerse) => void;
  onVerseLongPress?: (verse: BibleVerse) => void;
  selectedVerseNumber?: number | null;
  flatListRef?: React.RefObject<FlatList<any> | null>;
  headerText?: string | null;
}

const BibleReaderView: React.FC<BibleReaderViewProps> = ({
  verses,
  isLoading,
  fontScale = 1,
  onVersePress,
  onVerseLongPress,
  selectedVerseNumber,
  flatListRef,
  headerText,
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

  return (
    <FlatList
      ref={flatListRef}
      data={verses}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={[
        styles.contentContainer,
        {paddingBottom: BIBLE_BASE_BOTTOM_PADDING + bottomScrollSpacerAdjusted},
      ]}
      ListHeaderComponent={
        headerText ? (
          <View style={styles.headerContainer}>
            <Text style={[styles.headerText, {color: theme.colors.textPrimary}]}>{headerText}</Text>
          </View>
        ) : null
      }
      onScrollToIndexFailed={(info) => {
        setTimeout(() => {
          flatListRef?.current?.scrollToIndex({
            index: info.index,
            animated: true,
            viewPosition: 0.2,
          });
        }, 220);
      }}
      renderItem={({ item }) => (
        <VerseItem
          item={item}
          theme={theme}
          fontScale={fontScale}
          selectedVerseNumber={selectedVerseNumber}
          onVersePress={onVersePress}
          onVerseLongPress={onVerseLongPress}
        />
      )}
      initialNumToRender={18}
      maxToRenderPerBatch={12}
      updateCellsBatchingPeriod={40}
      windowSize={10}
      removeClippedSubviews={Platform.OS === 'android'}
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
  contentContainer: {
    paddingBottom: BIBLE_BASE_BOTTOM_PADDING,
  },
  headerContainer: {
    paddingBottom: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
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
