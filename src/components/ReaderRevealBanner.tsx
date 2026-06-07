import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {type Devotional} from '../hooks/useDailyDevotional';
import {TOPIC_LABEL_MG} from '../devotional/topics';
import {useTheme} from '../contexts/ThemeContext';
import {hexToRgba} from '../utils/colorUtils';

const DEVOTIONAL_EXCERPT_CHARS = 220;

const firstParagraphText = (devotional: Devotional): string => {
  for (const block of devotional.blocks) {
    if (block.type === 'paragraph') return block.text;
  }
  // No paragraph? Fall back to verse text, then heading, so the card is
  // never empty when blocks exist.
  for (const block of devotional.blocks) {
    if (block.type === 'verse') return block.text;
    if (block.type === 'heading') return block.text;
  }
  return '';
};

type Props = {
  // Devotional to render. Pass null/undefined to render nothing (e.g. while
  // the daily fetch is still in flight, or when there's no entry for today).
  devotional: Devotional | null | undefined;
  // Per-session visibility. When false, the banner renders nothing. The
  // parent owns this state so dismissal survives mode switches (Bible↔Hymn)
  // and only resets on app launch.
  visible?: boolean;
  // Called when the user explicitly dismisses (× or tap outside, depending
  // on how the parent wires it). Optional — without it the × button is
  // hidden, useful for stories or read-only previews. The parent is also
  // responsible for marking the devotional "seen" inside this handler so
  // the top glow stops pulsing — we don't fire a separate onSeen on mount,
  // because that would mean every app launch marks today's devotional read
  // before the user has actually seen anything new.
  onDismiss?: () => void;
};

export const ReaderRevealBanner: React.FC<Props> = ({
  devotional,
  visible = true,
  onDismiss,
}) => {
  // Banner used to recolor itself per devotional topic (love/hope/joy…). We
  // now follow the app's overall theme instead: the per-topic palette was
  // pulling the eye away from the reader background and clashing with the
  // user's custom primary color. The topic chip text still names the topic,
  // just in the neutral accent color.
  const {theme} = useTheme();
  const accent = theme.colors.accentBlue;

  const devotionalExcerpt = useMemo(() => {
    if (!devotional) return '';
    const source = firstParagraphText(devotional);
    if (source.length <= DEVOTIONAL_EXCERPT_CHARS) return source;
    return source.slice(0, DEVOTIONAL_EXCERPT_CHARS).trimEnd() + '…';
  }, [devotional]);

  if (!visible) return null;
  if (!devotional) return null;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.devotionalCard,
          {
            backgroundColor: theme.colors.backgroundSecondary,
            borderColor: hexToRgba(accent, 0.35),
          },
        ]}>
        {onDismiss ? (
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            accessibilityLabel="Hidio"
            accessibilityRole="button"
            style={[
              styles.dismissButton,
              {backgroundColor: hexToRgba(accent, 0.12)},
            ]}>
            <Text
              style={[styles.dismissButtonText, {color: accent}]}
              allowFontScaling={false}>
              ×
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.devotionalEyebrowRow}>
          {devotional.verseRef ? (
            <Text style={[styles.devotionalEyebrow, {color: accent}]}>
              {devotional.verseRef}
            </Text>
          ) : null}
          <View
            style={[
              styles.topicChip,
              {
                backgroundColor: hexToRgba(accent, 0.18),
                borderColor: hexToRgba(accent, 0.35),
              },
            ]}>
            <Text style={[styles.topicChipText, {color: accent}]}>
              {TOPIC_LABEL_MG[devotional.topic]}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.devotionalTitle, {color: theme.colors.textPrimary}]}
          numberOfLines={2}>
          {devotional.title}
        </Text>
        <Text style={[styles.devotionalBody, {color: theme.colors.textPrimary}]}>
          {devotionalExcerpt}
        </Text>
        {devotional.author ? (
          <Text
            style={[
              styles.devotionalAuthor,
              {color: theme.colors.textPrimary, opacity: 0.6},
            ]}>
            — {devotional.author}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  devotionalCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    // Reserve space on the right so the eyebrow row's chip never collides
    // with the absolutely-positioned dismiss button.
    paddingRight: 40,
  },
  dismissButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  devotionalEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  devotionalEyebrow: {
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
  devotionalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  devotionalBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  devotionalAuthor: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default ReaderRevealBanner;
