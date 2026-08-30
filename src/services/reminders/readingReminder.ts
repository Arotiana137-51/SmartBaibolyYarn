import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {AndroidImportance, RepeatFrequency, TriggerType} from '@notifee/react-native';

/**
 * "Ora famakiana tiana" — optional, on-device reminders to read the Bible,
 * each delivered as a real OS notification (not an in-app banner). Fully
 * local: no backend, no push, nothing leaves the device.
 *
 * A user can keep several independent reminder slots — e.g. twice a day, or
 * a daily one plus a weekly one — rather than a single fixed time. "Twice a
 * day" is just two daily slots; there's no separate "N times a day" concept.
 *
 * Scheduling is deliberately INEXACT (no `alarmManager` option on the
 * trigger) — a few minutes of drift is an acceptable tradeoff for "read
 * around this time", and it avoids Android 12+'s exact-alarm permission
 * dance entirely (see the matching manifest strip in
 * android/app/src/main/AndroidManifest.xml).
 *
 * Permission (notifee.requestPermission) is orchestrated by the screen, not
 * here — this module assumes permission is already granted by the time it's
 * asked to schedule something.
 */

const STORAGE_KEY_SLOTS = 'settings.readingReminder.slots';
const CHANNEL_ID = 'reading-reminder';

export const MAX_REMINDER_SLOTS = 5;

export type ReminderFrequency = 'daily' | 'weekly';

export type ReminderSlot = {
  id: string;
  enabled: boolean;
  time: string; // "HH:mm", 24h
  frequency: ReminderFrequency;
  // 0 (Sunday) - 6 (Saturday), same convention as Date#getDay(). Required
  // when frequency === 'weekly', unused for 'daily'.
  dayOfWeek?: number;
};

const notificationIdFor = (slotId: string) => `reading-reminder-${slotId}`;

export const createSlotId = (): string =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const getReminderSlots = async (): Promise<ReminderSlot[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SLOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ReminderSlot[]) : [];
  } catch {
    return [];
  }
};

const persistSlots = async (slots: ReminderSlot[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(slots));
  } catch {
    // best-effort persistence, same convention as issueReportQueue.ts
  }
};

// Next local-time occurrence of `time` (today if still upcoming, else
// tomorrow). No date library needed for a once-a-day timestamp.
const nextDailyOccurrence = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date();
  next.setSeconds(0, 0);
  next.setHours(hours, minutes);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
};

// Next local-time occurrence of `time` on the given day of week (0=Sunday).
const nextWeeklyOccurrence = (time: string, dayOfWeek: number): number => {
  const [hours, minutes] = time.split(':').map(Number);
  const next = new Date();
  next.setSeconds(0, 0);
  next.setHours(hours, minutes);
  let daysAhead = (dayOfWeek - next.getDay() + 7) % 7;
  if (daysAhead === 0 && next.getTime() <= Date.now()) {
    daysAhead = 7;
  }
  next.setDate(next.getDate() + daysAhead);
  return next.getTime();
};

const scheduleSlot = async (slot: ReminderSlot): Promise<void> => {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Ora famakiana', // placeholder — user-owned MG copy
    importance: AndroidImportance.DEFAULT,
  });

  const timestamp =
    slot.frequency === 'weekly'
      ? nextWeeklyOccurrence(slot.time, slot.dayOfWeek ?? 0)
      : nextDailyOccurrence(slot.time);

  await notifee.createTriggerNotification(
    {
      id: notificationIdFor(slot.id),
      title: 'Ora famakiana Baiboly', // placeholder — user-owned MG copy
      body: "Tonga ny fotoana hamakiana ny Tenin'Andriamanitra", // placeholder
      android: {channelId: CHANNEL_ID},
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      repeatFrequency:
        slot.frequency === 'weekly' ? RepeatFrequency.WEEKLY : RepeatFrequency.DAILY,
      // No `alarmManager` key — inexact by default, see module doc above.
    },
  );
};

const cancelSlot = async (slotId: string): Promise<void> => {
  try {
    await notifee.cancelTriggerNotification(notificationIdFor(slotId));
  } catch (error) {
    if (__DEV__) console.warn('[readingReminder] cancel failed:', error);
  }
};

/**
 * Upserts a slot by id (new id → appended, existing id → replaced) and
 * (re)schedules or cancels its native trigger to match `enabled`. Caller is
 * responsible for permission — this assumes it's already granted when
 * `enabled` is true.
 */
export const saveReminderSlot = async (slot: ReminderSlot): Promise<void> => {
  const slots = await getReminderSlots();
  const index = slots.findIndex(s => s.id === slot.id);
  const next = index === -1 ? [...slots, slot] : slots.map(s => (s.id === slot.id ? slot : s));
  await persistSlots(next);

  if (slot.enabled) {
    await scheduleSlot(slot);
  } else {
    await cancelSlot(slot.id);
  }
};

export const deleteReminderSlot = async (slotId: string): Promise<void> => {
  const slots = await getReminderSlots();
  await persistSlots(slots.filter(s => s.id !== slotId));
  await cancelSlot(slotId);
};

/**
 * Idempotent re-arm, called once on app launch. notifee's own receivers
 * already re-arm each trigger after it fires and after device reboot; this
 * closes the remaining gap where Android force-stop or an aggressive OEM
 * battery manager silently drops a pending alarm with no signal to JS.
 */
export const ensureRemindersScheduled = async (): Promise<void> => {
  try {
    const slots = await getReminderSlots();
    for (const slot of slots) {
      if (slot.enabled) {
        await scheduleSlot(slot);
      }
    }
  } catch (error) {
    if (__DEV__) console.warn('[readingReminder] ensureRemindersScheduled failed:', error);
  }
};
