import React, {useMemo} from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import type {
  CalloutBlock,
  HeadingBlock,
  ImageBlock,
  ListBlock,
  ParagraphBlock,
  PrayerBlock,
  QuoteBlock,
  VerseBlock,
} from '../../devotional/schema';
import type {DevotionalTone} from '../../devotional/topics';
import {useTheme} from '../../contexts/ThemeContext';
import {hexToRgba} from '../../utils/colorUtils';

// Block renderers for the daily devotional. Each block is a "card" — bordered,
// rounded, padded — matching the visual vocabulary established by
// ReaderRevealBanner (borderRadius 14, borderWidth 1, padding 14). Blocks that
// carry the topic's voice (verse, callout, prayer, quote) get a tinted fill +
// accent border; structural blocks (paragraph, heading, list, image) sit on a
// neutral surface so the topic's color doesn't drown the reading itself.
//
// All blocks accept the resolved `DevotionalTone`. They never look up the topic
// themselves — that's the composer's job (see DevotionalView).

type WithTone<T> = {block: T; tone: DevotionalTone};

const TINTED_CARD_BG_ALPHA = 0.07;
const TINTED_CARD_BORDER_ALPHA = 0.35;
const EYEBROW_TINT_ALPHA = 0.18;

// --- paragraph ---------------------------------------------------------------

export const ParagraphBlockView: React.FC<WithTone<ParagraphBlock>> = ({
  block,
  tone,
}) => {
  const {theme} = useTheme();
  return (
    <View
      style={[
        styles.neutralCard,
        {
          backgroundColor: theme.colors.backgroundSecondary,
          borderColor: theme.colors.divider,
        },
      ]}>
      <Text style={[styles.bodyText, {color: tone.onSurface}]}>
        {block.text}
      </Text>
    </View>
  );
};

// --- heading -----------------------------------------------------------------

export const HeadingBlockView: React.FC<WithTone<HeadingBlock>> = ({
  block,
  tone,
}) => {
  // Headings sit transparent — they're section breaks, not cards. The accent
  // underline ties them to the topic without competing with the cards above
  // and below.
  const size: TextStyle =
    block.level === 2 ? {fontSize: 20} : {fontSize: 17};
  return (
    <View style={styles.headingWrap}>
      <Text
        style={[
          styles.headingText,
          size,
          {color: tone.accent},
        ]}>
        {block.text}
      </Text>
      <View
        style={[
          styles.headingRule,
          {backgroundColor: hexToRgba(tone.accent, 0.4)},
        ]}
      />
    </View>
  );
};

// --- verse -------------------------------------------------------------------

export const VerseBlockView: React.FC<WithTone<VerseBlock>> = ({
  block,
  tone,
}) => (
  <View
    style={[
      styles.tintedCard,
      {
        backgroundColor: tone.surface,
        borderColor: hexToRgba(tone.accent, TINTED_CARD_BORDER_ALPHA),
      },
    ]}>
    <Text style={[styles.eyebrow, {color: tone.accent}]}>{block.ref}</Text>
    <Text style={[styles.verseText, {color: tone.onSurface}]}>
      {block.text}
    </Text>
  </View>
);

// --- callout -----------------------------------------------------------------

export const CalloutBlockView: React.FC<WithTone<CalloutBlock>> = ({
  block,
  tone,
}) => {
  const {theme} = useTheme();
  // 'muted' callouts use the theme's neutral surface; 'topic' (default)
  // borrows the topic tint. Both keep an accent left-bar so the eye groups
  // them as "the author speaking aside".
  const isMuted = block.variant === 'muted';
  const bg = isMuted
    ? theme.colors.backgroundSecondary
    : hexToRgba(tone.accent, TINTED_CARD_BG_ALPHA);
  const border = isMuted
    ? theme.colors.divider
    : hexToRgba(tone.accent, TINTED_CARD_BORDER_ALPHA);
  return (
    <View
      style={[
        styles.calloutCard,
        {backgroundColor: bg, borderColor: border},
      ]}>
      <View
        style={[styles.calloutBar, {backgroundColor: tone.accent}]}
      />
      <Text style={[styles.calloutText, {color: tone.onSurface}]}>
        {block.text}
      </Text>
    </View>
  );
};

// --- quote -------------------------------------------------------------------

export const QuoteBlockView: React.FC<WithTone<QuoteBlock>> = ({
  block,
  tone,
}) => (
  <View
    style={[
      styles.tintedCard,
      {
        backgroundColor: hexToRgba(tone.accent, TINTED_CARD_BG_ALPHA),
        borderColor: hexToRgba(tone.accent, TINTED_CARD_BORDER_ALPHA),
      },
    ]}>
    <Text style={[styles.quoteOpenMark, {color: tone.accent}]}>“</Text>
    <Text style={[styles.quoteText, {color: tone.onSurface}]}>
      {block.text}
    </Text>
    {block.attribution ? (
      <Text style={[styles.quoteAttribution, {color: tone.onSurface}]}>
        — {block.attribution}
      </Text>
    ) : null}
  </View>
);

// --- prayer ------------------------------------------------------------------

export const PrayerBlockView: React.FC<WithTone<PrayerBlock>> = ({
  block,
  tone,
}) => (
  <View
    style={[
      styles.tintedCard,
      {
        backgroundColor: tone.surface,
        borderColor: hexToRgba(tone.accent, TINTED_CARD_BORDER_ALPHA),
      },
    ]}>
    <View
      style={[
        styles.eyebrowChip,
        {
          backgroundColor: hexToRgba(tone.accent, EYEBROW_TINT_ALPHA),
          borderColor: hexToRgba(tone.accent, TINTED_CARD_BORDER_ALPHA),
        },
      ]}>
      <Text style={[styles.eyebrowChipText, {color: tone.accent}]}>
        VAVAKA
      </Text>
    </View>
    <Text style={[styles.prayerText, {color: tone.onSurface}]}>
      {block.text}
    </Text>
  </View>
);

// --- list --------------------------------------------------------------------

export const ListBlockView: React.FC<WithTone<ListBlock>> = ({
  block,
  tone,
}) => {
  const {theme} = useTheme();
  const ordered = block.ordered === true;
  return (
    <View
      style={[
        styles.neutralCard,
        {
          backgroundColor: theme.colors.backgroundSecondary,
          borderColor: theme.colors.divider,
        },
      ]}>
      {block.items.map((item, idx) => (
        <View key={`${idx}-${item.length}`} style={styles.listRow}>
          <Text style={[styles.listMarker, {color: tone.accent}]}>
            {ordered ? `${idx + 1}.` : '•'}
          </Text>
          <Text style={[styles.listItemText, {color: tone.onSurface}]}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
};

// --- image -------------------------------------------------------------------

export const ImageBlockView: React.FC<WithTone<ImageBlock>> = ({
  block,
  tone,
}) => {
  const {theme} = useTheme();
  const aspectRatio = block.aspectRatio ?? 16 / 9;
  const imageStyle: StyleProp<ImageStyle> = useMemo(
    () => ({width: '100%', aspectRatio}),
    [aspectRatio],
  );
  return (
    <View
      style={[
        styles.imageCard,
        {
          backgroundColor: theme.colors.backgroundSecondary,
          borderColor: theme.colors.divider,
        },
      ]}>
      <Image
        source={{uri: block.url}}
        style={imageStyle}
        accessibilityLabel={block.alt}
        resizeMode="cover"
      />
      {block.caption ? (
        <Text style={[styles.imageCaption, {color: tone.onSurface}]}>
          {block.caption}
        </Text>
      ) : null}
    </View>
  );
};

// --- styles ------------------------------------------------------------------

const cardBase: ViewStyle = {
  borderWidth: 1,
  borderRadius: 14,
  padding: 14,
};

const styles = StyleSheet.create({
  neutralCard: {
    ...cardBase,
  },
  tintedCard: {
    ...cardBase,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
  },
  headingWrap: {
    paddingTop: 6,
    paddingBottom: 4,
    gap: 6,
  },
  headingText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headingRule: {
    height: 2,
    width: 36,
    borderRadius: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  calloutCard: {
    ...cardBase,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: 0,
    overflow: 'hidden',
  },
  calloutBar: {
    width: 4,
    borderTopLeftRadius: 13,
    borderBottomLeftRadius: 13,
    marginRight: 12,
  },
  calloutText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 2,
  },
  quoteOpenMark: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  quoteAttribution: {
    fontSize: 13,
    marginTop: 6,
    opacity: 0.7,
  },
  eyebrowChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  eyebrowChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  prayerText: {
    fontSize: 15,
    lineHeight: 23,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  listMarker: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 18,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  imageCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imageCaption: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    opacity: 0.75,
    fontStyle: 'italic',
  },
});
