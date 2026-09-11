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
