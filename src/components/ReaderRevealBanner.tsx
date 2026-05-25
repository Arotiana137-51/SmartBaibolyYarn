import React, {useCallback, useEffect, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../contexts/ThemeContext';
import {
  useInAppNotifications,
  type InAppNotification,
} from '../contexts/InAppNotificationContext';
import {useDailyDevotional, type Devotional} from '../hooks/useDailyDevotional';
import {useDevotionalTone, TOPIC_LABEL_MG} from '../devotional/topics';
import {hexToRgba} from '../utils/colorUtils';
import type {RootStackParamList} from '../navigation/RootNavigator';

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
}) => {
  const {theme} = useTheme();
  const {data: devotional, status} = useDailyDevotional();
  const {notifications, unreadCount, markAllSeen, markAsRead} =
    useInAppNotifications();
  // Default navigation target: dedicated DevotionalScreen. Callers can still
  // override via onOpenDevotional (e.g. to show an in-context preview).
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleOpenDevotional = useCallback(
    (d: Devotional) => {
      if (onOpenDevotional) {
        onOpenDevotional(d);
        return;
      }
      navigation.navigate('Devotional');
    },
    [navigation, onOpenDevotional],
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
