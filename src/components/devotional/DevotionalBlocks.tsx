import React, {useMemo} from 'react';
import {
  Image,
  Platform,
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

// Material 3 block renderers. Each block is a card following M3's
// surface/elevation pattern:
//   - Structural blocks (paragraph, list, image) sit on
//     surfaceContainerLow with elevation 1.
//   - Topic-voiced blocks (verse, callout, prayer, quote) use a tonal
//     container — accent tint at low alpha — with elevation 2.
//   - Borders are dropped in favor of elevation + container color.
// All blocks accept the resolved `DevotionalTone`. They never look up the
// topic themselves — that's the composer's job (see DevotionalView).

type WithTone<T> = {block: T; tone: DevotionalTone};

const TONAL_BG_ALPHA = 0.10;
const TONAL_BG_ALPHA_DARK = 0.18;

// M3 elevation tokens approximated for RN (Android elevation + iOS shadow).
const elev = (level: 1 | 2): ViewStyle =>
  Platform.select<ViewStyle>({
    android: {elevation: level === 1 ? 1 : 2},
    ios: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: level === 1 ? 1 : 2},
      shadowOpacity: level === 1 ? 0.08 : 0.14,
      shadowRadius: level === 1 ? 3 : 6,
    },
    default: {},
  }) as ViewStyle;

// --- paragraph ---------------------------------------------------------------

export const ParagraphBlockView: React.FC<WithTone<ParagraphBlock>> = ({
  block,
}) => {
  const {theme} = useTheme();
  return (
    <View
      style={[
        styles.card,
        elev(1),
        {backgroundColor: theme.colors.backgroundSecondary},
      ]}>
      <Text
        style={[styles.bodyText, {color: theme.colors.textPrimary}]}>
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
  // Headings are M3 section labels — no card, larger letter-spacing.
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
    </View>
  );
};

// --- verse -------------------------------------------------------------------

export const VerseBlockView: React.FC<WithTone<VerseBlock>> = ({
  block,
  tone,
}) => {
  const {theme} = useTheme();
  const tonalBg = hexToRgba(
    tone.accent,
    theme.isDark ? TONAL_BG_ALPHA_DARK : TONAL_BG_ALPHA,
  );
  return (
    <View
      style={[
        styles.card,
        elev(2),
        {backgroundColor: tonalBg},
      ]}>
      <Text style={[styles.eyebrow, {color: tone.accent}]}>{block.ref}</Text>
      <Text style={[styles.verseText, {color: theme.colors.textPrimary}]}>
        {block.text}
      </Text>
    </View>
  );
};

// --- callout -----------------------------------------------------------------

export const CalloutBlockView: React.FC<WithTone<CalloutBlock>> = ({
  block,
  tone,
}) => {
  const {theme} = useTheme();
  const isMuted = block.variant === 'muted';
  const bg = isMuted
    ? theme.colors.backgroundSecondary
    : hexToRgba(
        tone.accent,
        theme.isDark ? TONAL_BG_ALPHA_DARK : TONAL_BG_ALPHA,
      );
  return (
    <View
      style={[
        styles.calloutCard,
        elev(isMuted ? 1 : 2),
        {backgroundColor: bg},
      ]}>
      <View
        style={[styles.calloutBar, {backgroundColor: tone.accent}]}
      />
      <Text
        style={[styles.calloutText, {color: theme.colors.textPrimary}]}>
        {block.text}
      </Text>
    </View>
  );
};

// --- quote -------------------------------------------------------------------

export const QuoteBlockView: React.FC<WithTone<QuoteBlock>> = ({
  block,
  tone,
}) => {
  const {theme} = useTheme();
  const tonalBg = hexToRgba(
    tone.accent,
    theme.isDark ? TONAL_BG_ALPHA_DARK : TONAL_BG_ALPHA,
  );
  return (
    <View
      style={[
        styles.card,
        elev(2),
        {backgroundColor: tonalBg},
      ]}>
      <Text style={[styles.quoteOpenMark, {color: tone.accent}]}>“</Text>
      <Text style={[styles.quoteText, {color: theme.colors.textPrimary}]}>
        {block.text}
      </Text>
      {block.attribution ? (
        <Text
          style={[
            styles.quoteAttribution,
            {color: theme.colors.textSecondary},
          ]}>
          — {block.attribution}
        </Text>
      ) : null}
    </View>
  );
};

// --- prayer ------------------------------------------------------------------

export const PrayerBlockView: React.FC<WithTone<PrayerBlock>> = ({
  block,
  tone,
}) => {
  const {theme} = useTheme();
  const tonalBg = hexToRgba(
    tone.accent,
    theme.isDark ? TONAL_BG_ALPHA_DARK : TONAL_BG_ALPHA,
  );
  return (
    <View
      style={[
        styles.card,
        elev(2),
        {backgroundColor: tonalBg},
      ]}>
      <View
        style={[
          styles.eyebrowChip,
          {backgroundColor: hexToRgba(tone.accent, 0.22)},
        ]}>
        <Text style={[styles.eyebrowChipText, {color: tone.accent}]}>
          VAVAKA
        </Text>
      </View>
      <Text
        style={[styles.prayerText, {color: theme.colors.textPrimary}]}>
        {block.text}
      </Text>
    </View>
  );
};

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
        styles.card,
        elev(1),
        {backgroundColor: theme.colors.backgroundSecondary},
      ]}>
      {block.items.map((item, idx) => (
        <View key={`${idx}-${item.length}`} style={styles.listRow}>
          <Text style={[styles.listMarker, {color: tone.accent}]}>
            {ordered ? `${idx + 1}.` : '•'}
          </Text>
          <Text
            style={[
              styles.listItemText,
              {color: theme.colors.textPrimary},
            ]}>
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
        elev(1),
        {backgroundColor: theme.colors.backgroundSecondary},
      ]}>
      <Image
        source={{uri: block.url}}
        style={imageStyle}
        accessibilityLabel={block.alt}
        resizeMode="cover"
      />
      {block.caption ? (
        <Text
          style={[
            styles.imageCaption,
            {color: theme.colors.textSecondary},
          ]}>
          {block.caption}
        </Text>
      ) : null}
    </View>
  );
};

// --- styles ------------------------------------------------------------------

const cardBase: ViewStyle = {
  borderRadius: 16,
  padding: 16,
};

const styles = StyleSheet.create({
  card: {
    ...cardBase,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
  },
  headingWrap: {
    paddingTop: 8,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },
  headingText: {
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
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
    marginRight: 14,
  },
  calloutText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 2,
  },
  quoteOpenMark: {
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  quoteAttribution: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
  eyebrowChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 24,
    justifyContent: 'center',
    marginBottom: 10,
  },
  eyebrowChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  prayerText: {
    fontSize: 15,
    lineHeight: 23,
  },
  listRow: {
    flexDirection: 'row',
    gap: 10,
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
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageCaption: {
    fontSize: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontStyle: 'italic',
  },
});
