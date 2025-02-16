import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  static async registerForPushNotifications() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      // Get the project ID from environment variables
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        throw new Error(
          'Expo project ID is not configured. Please set EXPO_PROJECT_ID in your environment variables.'
        );
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      throw error;
    }
  }

  static async scheduleLocalNotification(
    title: string,
    body: string,
    trigger?: Notifications.NotificationTriggerInput
  ) {
    try {
      const notificationContent: Notifications.NotificationContentInput = {
        title,
        body,
        data: { type: 'local' },
      };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: trigger || null,
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  static async sendImmediateNotification(title: string, body: string) {
    return this.scheduleLocalNotification(title, body);
  }

  static async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
      throw error;
    }
  }

  static addNotificationReceivedListener(listener: (event: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  static addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
}
