import {useEffect, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {useDailyDevotional} from './useDailyDevotional';
import {useInAppNotifications} from '../contexts/InAppNotificationContext';

const LAST_SEEN_KEY = '@devotional_last_seen_date_v1';

// Bridges the daily devotional into the notification system so the
// DevotionalGlow lights up when fresh content arrives. When a devotional
// with a date the user hasn't acknowledged yet appears, push a local
// notification. DevotionalScreen calls markAllSeen() on mount, which clears
// unreadCount and stops the glow.
export const useDevotionalGlow = () => {
  const {data} = useDailyDevotional();
  const {pushLocal, isReady, notifications} = useInAppNotifications();
  const announcedDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !data) return;
    const date = data.date;
    if (announcedDateRef.current === date) return;

    (async () => {
      try {
        const lastSeen = await AsyncStorage.getItem(LAST_SEEN_KEY);
        if (lastSeen === date) {
          announcedDateRef.current = date;
          return;
        }
        const alreadyAnnounced = notifications.some(n => {
          const paramDate = n.deepLink?.params?.devotionalDate;
          return typeof paramDate === 'string' && paramDate === date;
        });
        if (alreadyAnnounced) {
          announcedDateRef.current = date;
          return;
        }
        pushLocal({
          title: data.title,
          body: data.verseRef ?? '',
          deepLink: {route: 'Devotional', params: {devotionalDate: date}},
        });
        await AsyncStorage.setItem(LAST_SEEN_KEY, date);
        announcedDateRef.current = date;
      } catch {
        // Non-fatal: glow just won't light up this session.
      }
    })();
  }, [data, isReady, notifications, pushLocal]);
};
