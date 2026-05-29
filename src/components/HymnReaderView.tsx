import React, {useCallback, useMemo} from 'react';
import { View, Text, StyleSheet, FlatList, Platform, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  type SharedValue,
} from 'react-native-reanimated';
import { HymnVerse } from '../hooks/useHymnsData';
import { useTheme, useLowEndMode } from '../contexts/ThemeContext';
import {useDevotionalPullTrigger} from '../hooks/useDevotionalPullTrigger';

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
  hymnTitle?: string | null;
  fontScale?: number;
  onHymnLongPress?: (stanzaNumber: number, stanzaText: string) => void;
  // Fired when the user pulls down past the platform threshold at the top
  // of the reader. Opens the devotional overlay in MainScreen.
  onPullToOpenDevotional?: () => void;
  // Reader scroll offset shared with DevotionalGlow. Written via
  // useAnimatedScrollHandler so the glow's ellipse can grow with scroll
  // without round-tripping through React.
  glowScrollY?: SharedValue<number>;
}

interface HymnStanza {
  verseNumber: number;
  lines: HymnVerse[];
}

interface HymnStanzaItemProps {
  item: HymnStanza;
  fontScale: number;
  readerText: string;
  verseNumberColor: string;
  stanzaCardBackground: string;
  chorusBackground: string;
  chorusLines: HymnVerse[];
  onHymnLongPress?: (stanzaNumber: number, stanzaText: string) => void;
}

const HymnStanzaItem = React.memo<HymnStanzaItemProps>(({
  item,
  fontScale,
  readerText,
  verseNumberColor,
  stanzaCardBackground,
  chorusBackground,
  chorusLines,
  onHymnLongPress,
}) => {
  const stanzaText = useMemo(
    () => item.lines.map(line => line.text).join('\n'),
    [item.lines],
  );
  const lineHeight = Math.round(
    styles.hymnText.fontSize * fontScale * HYMN_LINE_HEIGHT_MULTIPLIER,
  );
  const lineFontSize = styles.hymnText.fontSize * fontScale;

  return (
    <View style={styles.stanzaBlock}>
      <Pressable
        style={[styles.hymnStanza, {backgroundColor: stanzaCardBackground}]}
        onLongPress={() => onHymnLongPress?.(item.verseNumber, stanzaText)}
        disabled={!onHymnLongPress}
      >
        <Text
          maxFontSizeMultiplier={1.3}
          style={[
            styles.hymnNumber,
            {
              fontSize: styles.hymnNumber.fontSize * fontScale,
              color: verseNumberColor,
            },
          ]}>
          {item.verseNumber}
        </Text>
        <View style={styles.hymnTextContainer}>
          {item.lines.map((line) => (
            <Text
              key={line.id}
              maxFontSizeMultiplier={1.3}
              style={[
                styles.hymnText,
                {
                  fontSize: lineFontSize,
                  lineHeight,
                  color: readerText,
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
            maxFontSizeMultiplier={1.3}
            style={[
              styles.chorusLabel,
              {
                fontSize: styles.chorusLabel.fontSize * fontScale,
                color: verseNumberColor,
              },
            ]}
          >
            Refrain
          </Text>
          <View style={styles.chorusTextContainer}>
            {chorusLines.map((line) => (
              <Text
                key={`chorus-${line.id}`}
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.hymnText,
                  styles.chorusLine,
                  {
                    fontSize: lineFontSize,
                    lineHeight,
                    color: readerText,
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
}, (prev, next) =>
  prev.item.verseNumber === next.item.verseNumber &&
  prev.fontScale === next.fontScale &&
  prev.readerText === next.readerText &&
  prev.verseNumberColor === next.verseNumberColor &&
  prev.stanzaCardBackground === next.stanzaCardBackground &&
  prev.chorusBackground === next.chorusBackground &&
  prev.chorusLines === next.chorusLines
);

const HymnReaderView: React.FC<HymnReaderViewProps> = ({
  hymnVerses,
  isLoading,
  hymnTitle,
  fontScale = 1,
  onHymnLongPress,
  onPullToOpenDevotional,
  glowScrollY,
}) => {
  const { theme } = useTheme();
  const { isLowEndMode } = useLowEndMode();
  const insets = useSafeAreaInsets();

  const hasTitle = typeof hymnTitle === 'string' && hymnTitle.trim().length > 0;

  const bottomScrollSpacer =
    Math.max(insets.bottom, 0) +
    FLOATING_BOTTOM_NAV_SPACER.offsetFromBottom +
    FLOATING_BOTTOM_NAV_SPACER.containerPaddingTop +
    FLOATING_BOTTOM_NAV_SPACER.segmentHeight +
    FLOATING_BOTTOM_NAV_SPACER.trackPaddingVertical +
    FLOATING_BOTTOM_NAV_SPACER.extraMargin;

  const bottomScrollSpacerAdjusted = Math.round(bottomScrollSpacer * 0.5) + 7;

  const {chorusLines, hymnStanzas} = useMemo(() => {
    const chorus = hymnVerses.filter(verse => verse.is_chorus);
    const stanzaOnly = hymnVerses.filter(verse => !verse.is_chorus);

    const grouped = stanzaOnly.reduce<Record<number, HymnVerse[]>>(
      (accumulator, verse) => {
        const bucket = accumulator[verse.verse_number] ?? [];
        bucket.push(verse);
        accumulator[verse.verse_number] = bucket;
        return accumulator;
      },
      {},
    );

    const stanzas = Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([verseNumber, stanzaVerses]) => ({
        verseNumber: Number(verseNumber),
        lines: stanzaVerses,
      }));

    return {chorusLines: chorus, hymnStanzas: stanzas};
  }, [hymnVerses]);

  const stanzaCardBackground = theme.isDark
    ? hexToRgba('#FFFFFF', 0.015)
    : hexToRgba('#000000', 0.01);

  const chorusBackground = theme.isDark
    ? hexToRgba('#FFFFFF', 0.02)
    : hexToRgba('#000000', 0.015);

  const keyExtractor = useCallback((item: HymnStanza) => item.verseNumber.toString(), []);

  const renderItem = useCallback(
    ({item}: {item: HymnStanza}) => (
      <HymnStanzaItem
        item={item}
        fontScale={fontScale}
        readerText={theme.colors.readerText}
        verseNumberColor={theme.colors.verseNumber}
        stanzaCardBackground={stanzaCardBackground}
        chorusBackground={chorusBackground}
        chorusLines={chorusLines}
        onHymnLongPress={onHymnLongPress}
      />
    ),
    [
      fontScale,
      theme.colors.readerText,
      theme.colors.verseNumber,
      stanzaCardBackground,
      chorusBackground,
      chorusLines,
      onHymnLongPress,
    ],
  );

  const handlePullTrigger = useCallback(() => {
    onPullToOpenDevotional?.();
  }, [onPullToOpenDevotional]);
  const {refreshing, onRefresh} = useDevotionalPullTrigger(handlePullTrigger);

  // Mirror the FlatList's scroll offset into the shared value that drives
  // DevotionalGlow's ellipse radius. UI-thread only; no React re-renders.
  const glowScrollHandler = useAnimatedScrollHandler(event => {
    if (!glowScrollY) return;
    glowScrollY.value = Math.max(0, event.contentOffset.y);
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Mirror BibleReaderView's tuning so low-end phones get the same treatment.
  // Hymn stanza counts are small (typically 4-8), so high values won't hurt either.
  const listProps = isLowEndMode
    ? {
        initialNumToRender: 6,
        maxToRenderPerBatch: 4,
        updateCellsBatchingPeriod: 60,
        windowSize: 5,
        removeClippedSubviews: false,
      }
    : {
        initialNumToRender: 10,
        maxToRenderPerBatch: 8,
        updateCellsBatchingPeriod: 40,
        windowSize: 8,
        removeClippedSubviews: Platform.OS === 'android',
      };

  return (
    <Animated.FlatList
      data={hymnStanzas}
      keyExtractor={keyExtractor}
      onScroll={glowScrollHandler}
      scrollEventThrottle={16}
      contentContainerStyle={{paddingBottom: HYMN_BASE_BOTTOM_PADDING + bottomScrollSpacerAdjusted}}
      ListHeaderComponent={
        <View>
          {hasTitle ? (
            <View style={styles.headerContainer}>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.headerTitle,
                  {
                    color: theme.colors.readerText,
                    fontSize: styles.headerTitle.fontSize * fontScale,
                  },
                ]}
              >
                {hymnTitle!.trim()}
              </Text>
            </View>
          ) : null}
        </View>
      }
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accentBlue}
          colors={[theme.colors.accentBlue]}
          progressBackgroundColor={theme.colors.backgroundPrimary}
        />
      }
      {...listProps}
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
  headerContainer: {
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight:24,
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
  chorusLine: {
    // The refrain is set in italics so it reads as a sung aside, visually
    // distinct from the numbered stanzas around it.
    fontStyle: 'italic',
  },
});

export default HymnReaderView;
