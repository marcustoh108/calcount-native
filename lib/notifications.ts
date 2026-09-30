import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Local, on-device scheduled notifications only — no push server involved.
 * Confirmed working in Expo Go on SDK 54 for both platforms (unlike remote push,
 * which Expo Go dropped support for on Android starting SDK 53).
 */

const ANDROID_CHANNEL_ID = "reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

async function ensureAndroidChannel() {
  if (Platform.OS !== "android" || channelReady) return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

export async function areNotificationsPermitted(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Schedules a one-off local reminder `delayMinutes` from now. Returns the notification id (for cancellation), or null if not permitted. */
export async function scheduleReminder(title: string, body: string, delayMinutes: number): Promise<string | null> {
  const permitted = await areNotificationsPermitted();
  if (!permitted) return null;
  await ensureAndroidChannel();
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(60, Math.round(delayMinutes * 60)),
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

export async function cancelReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

const DAILY_WORKOUT_REMINDER_ID = "calcount-daily-workout-reminder";
const DAILY_WORKOUT_REMINDER_HOUR = 18; // 6:00 PM local time
const DAILY_WORKOUT_REMINDER_MINUTE = 0;

/** Repeating daily reminder at a fixed time (6:00 PM local) to move / log a workout. Re-scheduling replaces any existing one (same fixed identifier). */
export async function scheduleDailyWorkoutReminder(): Promise<void> {
  const permitted = await areNotificationsPermitted();
  if (!permitted) return;
  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(DAILY_WORKOUT_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_WORKOUT_REMINDER_ID,
    content: {
      title: "Time to move? 🏋️",
      body: "A workout — even a short one — keeps your calories in and out balanced. Log it in YumBalance when you're done.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: DAILY_WORKOUT_REMINDER_HOUR,
      minute: DAILY_WORKOUT_REMINDER_MINUTE,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

export async function cancelDailyWorkoutReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_WORKOUT_REMINDER_ID).catch(() => {});
}
