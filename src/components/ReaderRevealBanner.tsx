import React, {useCallback, useEffect, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {
  useInAppNotifications,
  type InAppNotification,
} from '../contexts/InAppNotificationContext';
import {useDailyDevotional, type Devotional} from '../hooks/useDailyDevotional';
import {useDevotionalTone, TOPIC_LABEL_MG} from '../devotional/topics';
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
  onOpenDevotional?: (devotional: Devotional) => void;
  onNotificationPress?: (notification: InAppNotification) => void;
  // Per-session visibility. When false, the banner renders nothing. The
  // parent owns the state so dismissal survives mode switches (Bible↔Hymn)
  // and only resets on app launch.
  visible?: boolean;
  onDismiss?: () => void;
};

const formatRelativeShort = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export const ReaderRevealBanner: React.FC<Props> = ({
  onOpenDevotional,
  onNotificationPress,
  visible = true,
  onDismiss,
}) => {
  const {theme} = useTheme();
  const {data: devotional, status} = useDailyDevotional();
  const {notifications, unreadCount, markAllSeen, markAsRead} =
    useInAppNotifications();
  // DevotionalScreen was parked — there is no default tap target anymore.
  // Callers may still opt in to handling taps via `onOpenDevotional`
  // (e.g. an in-context preview); otherwise the card is display-only.
  const handleOpenDevotional = useCallback(
    (d: Devotional) => {
      onOpenDevotional?.(d);
    },
    [onOpenDevotional],
  );

  const hasDevotional = status === 'success' && devotional != null;
  const hasNotifications = notifications.length > 0;

  const tone = useDevotionalTone(devotional?.topic ?? null);

  // Glow resets when the banner is visible (user has seen it).
  useEffect(() => {
    if ((hasDevotional || hasNotifications) && unreadCount > 0) {
      markAllSeen();
    }
  }, [hasDevotional, hasNotifications, unreadCount, markAllSeen]);

  const devotionalExcerpt = useMemo(() => {
    if (!devotional) return '';
    const source = firstParagraphText(devotional);
    if (source.length <= DEVOTIONAL_EXCERPT_CHARS) return source;
    return source.slice(0, DEVOTIONAL_EXCERPT_CHARS).trimEnd() + '…';
  }, [devotional]);

  if (!visible) {
    return null;
  }

  if (!hasDevotional && !hasNotifications) {
    return null;
  }

  return (
    <View style={styles.container}>
      {hasDevotional && devotional ? (
        <Pressable
          onPress={() => handleOpenDevotional(devotional)}
          style={[
            styles.devotionalCard,
            {
              backgroundColor: tone.surface,
              borderColor: hexToRgba(tone.accent, 0.35),
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
                {backgroundColor: hexToRgba(tone.accent, 0.12)},
              ]}>
              <Text
                style={[styles.dismissButtonText, {color: tone.accent}]}
                allowFontScaling={false}>
                ×
              </Text>
            </Pressable>
          ) : null}
          <View style={styles.devotionalEyebrowRow}>
            {devotional.verseRef ? (
              <Text style={[styles.devotionalEyebrow, {color: tone.accent}]}>
                {devotional.verseRef}
              </Text>
            ) : null}
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
          <Text
            style={[styles.devotionalTitle, {color: tone.onSurface}]}
            numberOfLines={2}>
            {devotional.title}
          </Text>
          <Text style={[styles.devotionalBody, {color: tone.onSurface}]}>
            {devotionalExcerpt}
          </Text>
          {devotional.author ? (
            <Text
              style={[
                styles.devotionalAuthor,
                {color: tone.onSurface, opacity: 0.6},
              ]}>
              — {devotional.author}
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      {hasNotifications ? (
        <View style={styles.notificationsList}>
          {notifications.map(n => {
            const unread = n.readAt == null;
            return (
              <Pressable
                key={n.id}
                onPress={() => {
                  markAsRead(n.id);
                  onNotificationPress?.(n);
                }}
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor: unread
                      ? hexToRgba(theme.colors.accentBlue, 0.06)
                      : 'transparent',
                    borderColor: unread
                      ? hexToRgba(theme.colors.accentBlue, 0.22)
                      : hexToRgba(theme.colors.textPrimary, 0.12),
                  },
                ]}>
                <View style={styles.notificationHeader}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      {color: theme.colors.textPrimary},
                    ]}
                    numberOfLines={1}>
                    {n.title}
                  </Text>
                  <Text
                    style={[
                      styles.notificationTime,
                      {color: theme.colors.textPrimary, opacity: 0.5},
                    ]}>
                    {formatRelativeShort(n.createdAt)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.notificationBody,
                    {color: theme.colors.textPrimary, opacity: 0.85},
                  ]}>
                  {n.body}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
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
  notificationsList: {
    gap: 8,
  },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ReaderRevealBanner;
