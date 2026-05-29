import React from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {Devotional, DevotionalBlock} from '../../devotional/schema';
import {
  TOPIC_LABEL_MG,
  useDevotionalTone,
} from '../../devotional/topics';
import {useTheme} from '../../contexts/ThemeContext';
import {hexToRgba} from '../../utils/colorUtils';

import {
  CalloutBlockView,
  HeadingBlockView,
  ImageBlockView,
  ListBlockView,
  ParagraphBlockView,
  PrayerBlockView,
  QuoteBlockView,
  VerseBlockView,
} from './DevotionalBlocks';

// Composes the daily devotional in a Material 3 vocabulary:
//   - Hero card uses M3 "filled" surface with elevation (no border).
//   - Topic chip is M3 Assist Chip shape (height 32, radius 8).
//   - Title uses M3 display-small type role; supporting copy uses
//     body-medium with onSurfaceVariant tone.
// The published date is intentionally NOT shown — publication cadence is
// irregular (could be daily, weekly, or longer); we just show the latest
// entry as "current" until a newer one lands.

type Props = {
  devotional: Devotional;
  // Forwarded to the inner ScrollView. The overlay variant uses these to
  // detect "scrolled past the end of content" for its dismiss gesture.
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollEndDrag?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
};

const renderBlock = (
  block: DevotionalBlock,
  tone: ReturnType<typeof useDevotionalTone>,
  key: string,
): React.ReactElement => {
  switch (block.type) {
    case 'paragraph':
      return <ParagraphBlockView key={key} block={block} tone={tone} />;
    case 'heading':
      return <HeadingBlockView key={key} block={block} tone={tone} />;
    case 'verse':
      return <VerseBlockView key={key} block={block} tone={tone} />;
    case 'callout':
      return <CalloutBlockView key={key} block={block} tone={tone} />;
    case 'quote':
      return <QuoteBlockView key={key} block={block} tone={tone} />;
    case 'prayer':
      return <PrayerBlockView key={key} block={block} tone={tone} />;
    case 'list':
      return <ListBlockView key={key} block={block} tone={tone} />;
    case 'image':
      return <ImageBlockView key={key} block={block} tone={tone} />;
  }
};

export const DevotionalView: React.FC<Props> = ({
  devotional,
  onScroll,
  onScrollEndDrag,
  scrollEventThrottle,
}) => {
  const {theme} = useTheme();
  const tone = useDevotionalTone(devotional.topic);

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: theme.colors.backgroundPrimary},
      ]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        scrollEventThrottle={scrollEventThrottle}>
      {/* Hero card — M3 filled surface, elevation rather than border. The
          topic tint is carried only by the chip + accent rail; the surface
          itself stays neutral so the title leads. */}
      <View
        style={[
          styles.hero,
          {
            backgroundColor: theme.colors.backgroundSecondary,
            shadowColor: theme.isDark ? '#000000' : tone.accent,
          },
        ]}>
        <View
          style={[
            styles.heroAccentRail,
            {backgroundColor: tone.accent},
          ]}
        />
        <View style={styles.heroBody}>
          {/* M3 assist-chip-style topic indicator. */}
          <View
            style={[
              styles.topicChip,
              {
                backgroundColor: hexToRgba(tone.accent, 0.14),
              },
            ]}>
            <View
              style={[
                styles.topicDot,
                {backgroundColor: tone.accent},
              ]}
            />
            <Text style={[styles.topicChipText, {color: tone.accent}]}>
              {TOPIC_LABEL_MG[devotional.topic]}
            </Text>
          </View>

          <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
            {devotional.title}
          </Text>

          {devotional.verseRef ? (
            <Text
              style={[
                styles.verseRef,
                {color: tone.accent},
              ]}>
              {devotional.verseRef}
            </Text>
          ) : null}

          {devotional.author ? (
            <Text
              style={[
                styles.author,
                {color: theme.colors.textSecondary},
              ]}>
              {devotional.author}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Block stack. */}
      {devotional.blocks.map((block, idx) =>
        renderBlock(block, tone, `${devotional.date}-${idx}-${block.type}`),
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  // M3 elevated card: no border, soft shadow, 16dp radius.
  hero: {
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      android: {elevation: 3},
      ios: {
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
    }),
  },
  heroAccentRail: {
    width: 4,
  },
  heroBody: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 10,
  },
  topicChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  topicDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // M3 headline-small: 24sp, weight 400. Bumped to 600 for hierarchy.
  title: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: 0,
  },
  // M3 title-medium role.
  verseRef: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  // M3 body-small / supporting text.
  author: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.25,
  },
});

export default DevotionalView;
