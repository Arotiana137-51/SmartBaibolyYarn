import React, {useCallback, useState} from 'react';
import {
  RefreshControl,
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

// Composes the daily devotional: a topic-tinted header card with title +
// topic chip + verse ref + author, followed by a card stack of block
// renderers. Owns pull-to-refresh — the screen above stays a thin shell
// that just passes the data + refresh callback in.

type Props = {
  devotional: Devotional;
  // Callback to trigger a re-fetch (typically hook.refresh). When omitted
  // the ScrollView is rendered without RefreshControl — useful for embedded
  // previews where pull-to-refresh would be confusing.
  onRefresh?: () => Promise<void>;
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

// Render the published date as a short Malagasy human-readable string.
// We only need this on the header card so a tiny inline helper beats a
// general-purpose i18n util.
const MG_MONTHS = [
  'Janoary',
  'Febroary',
  'Martsa',
  'Aprily',
  'Mey',
  'Jona',
  'Jolay',
  'Aogositra',
  'Septambra',
  'Oktobra',
  'Novambra',
  'Desambra',
];

const formatPublishedDate = (iso: string): string => {
  // The schema uses YYYY-MM-DD for `date`. Parse manually to avoid the
  // UTC-shift trap (`new Date('2026-05-25')` is midnight UTC, which is the
  // 24th in negative timezones).
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const day = Number.parseInt(m[3], 10);
  const month = Number.parseInt(m[2], 10);
  const year = m[1];
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return iso;
  }
  return `${day} ${MG_MONTHS[month - 1]} ${year}`;
};

export const DevotionalView: React.FC<Props> = ({devotional, onRefresh}) => {
  const {theme} = useTheme();
  const tone = useDevotionalTone(devotional.topic);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      style={[
        styles.scroll,
        {backgroundColor: theme.colors.backgroundPrimary},
      ]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={tone.accent}
            colors={[tone.accent]}
          />
        ) : undefined
      }>
      {/* Header card — topic-tinted to ground the rest of the stack. */}
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: tone.surface,
            borderColor: hexToRgba(tone.accent, 0.35),
          },
        ]}>
        <View style={styles.headerEyebrowRow}>
          <Text style={[styles.headerEyebrow, {color: tone.accent}]}>
            {formatPublishedDate(devotional.date)}
          </Text>
          <View
            style={[
              styles.topicChip,
              {
                backgroundColor: hexToRgba(tone.accent, 0.18),
                borderColor: hexToRgba(tone.accent, 0.35),
              },
            ]}>
            <Text style={[styles.topicChipText, {color: tone.accent}]}>
              {TOPIC_LABEL_MG[devotional.topic]}
            </Text>
          </View>
        </View>
        <Text style={[styles.title, {color: tone.onSurface}]}>
          {devotional.title}
        </Text>
        {devotional.verseRef ? (
          <Text
            style={[
              styles.verseRef,
              {color: tone.onSurface, opacity: 0.75},
            ]}>
            {devotional.verseRef}
          </Text>
        ) : null}
        {devotional.author ? (
          <Text
            style={[
              styles.author,
              {color: tone.onSurface, opacity: 0.6},
            ]}>
            — {devotional.author}
          </Text>
        ) : null}
      </View>

      {/* Block stack. */}
      {devotional.blocks.map((block, idx) =>
        renderBlock(block, tone, `${devotional.date}-${idx}-${block.type}`),
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 10,
    paddingBottom: 32,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 4,
  },
  headerEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  topicChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 6,
  },
  verseRef: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  author: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default DevotionalView;
