import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InAppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  deepLink?: {
    route: string;
    params?: Record<string, unknown>;
  };
};

type InAppNotificationContextValue = {
  notifications: InAppNotification[];
  unreadCount: number;
  isReady: boolean;
  markAllSeen: () => void;
  markAsRead: (id: string) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  // Test seam — push a local notification (used by FCM bridge later, or by a dev menu).
  pushLocal: (n: Omit<InAppNotification, 'id' | 'createdAt' | 'readAt'>) => void;
};

const STORAGE_KEY = 'inAppNotifications.v1';
const MAX_STORED = 50;

const InAppNotificationContext =
  createContext<InAppNotificationContextValue | null>(null);

const isNotification = (n: unknown): n is InAppNotification => {
  if (typeof n !== 'object' || n === null) return false;
  const candidate = n as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.body === 'string' &&
    typeof candidate.createdAt === 'string' &&
    (candidate.readAt === null || typeof candidate.readAt === 'string')
  );
};

export const InAppNotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({children}) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setNotifications(parsed.filter(isNotification));
          }
        }
      } catch {
        // ignore — start with empty list
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: InAppNotification[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore persistence errors — non-fatal
    }
  }, []);

  const update = useCallback(
    (mutator: (prev: InAppNotification[]) => InAppNotification[]) => {
      setNotifications(prev => {
        const next = mutator(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const markAllSeen = useCallback(() => {
    const now = new Date().toISOString();
    update(prev =>
      prev.map(n => (n.readAt ? n : {...n, readAt: now})),
    );
  }, [update]);

  const markAsRead = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      update(prev =>
        prev.map(n => (n.id === id && !n.readAt ? {...n, readAt: now} : n)),
      );
    },
    [update],
  );

  const dismiss = useCallback(
    (id: string) => {
      update(prev => prev.filter(n => n.id !== id));
    },
    [update],
  );

  const clearAll = useCallback(() => {
    update(() => []);
  }, [update]);

  const pushLocal = useCallback(
    (input: Omit<InAppNotification, 'id' | 'createdAt' | 'readAt'>) => {
      const created: InAppNotification = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: input.title,
        body: input.body,
        deepLink: input.deepLink,
        createdAt: new Date().toISOString(),
        readAt: null,
      };
      update(prev => [created, ...prev].slice(0, MAX_STORED));
    },
    [update],
  );

  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => (n.readAt ? acc : acc + 1), 0),
    [notifications],
  );

  const value = useMemo<InAppNotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isReady,
      markAllSeen,
      markAsRead,
      dismiss,
      clearAll,
      pushLocal,
    }),
    [
      notifications,
      unreadCount,
      isReady,
      markAllSeen,
      markAsRead,
      dismiss,
      clearAll,
      pushLocal,
    ],
  );

  return (
    <InAppNotificationContext.Provider value={value}>
      {children}
    </InAppNotificationContext.Provider>
  );
};

export const useInAppNotifications = () => {
  const ctx = useContext(InAppNotificationContext);
  if (!ctx) {
    throw new Error(
      'useInAppNotifications must be used within InAppNotificationProvider',
    );
  }
  return ctx;
};
