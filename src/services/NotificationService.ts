// import * as ExpoNotifications from 'expo-notifications';
// import { Platform } from 'react-native';
// import Constants from 'expo-constants';

// Configure notification handler
// ExpoNotifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//   }),
// });

export class NotificationService {
  static async registerForPushNotifications() {
    return null;
  }

  static async scheduleLocalNotification(title: string, body: string, trigger?: any) {
    return null;
  }

  static async sendImmediateNotification(title: string, body: string) {
    return null;
  }

  static async cancelAllNotifications() {
    return null;
  }

  static addNotificationReceivedListener(listener: (notification: any) => void): any {
    return null;
  }

  static addNotificationResponseReceivedListener(listener: (response: any) => void): any {
    return null;
  }

  static removeNotificationSubscription(subscription: any) {
    return null;
  }
}
