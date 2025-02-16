import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { NotificationService } from '../services/NotificationService';

export const NotificationTest = () => {
  const testImmediateNotification = async () => {
    try {
      await NotificationService.sendImmediateNotification(
        'Test Notification',
        'This is a test immediate notification!'
      );
    } catch (error) {
      console.error('Error sending immediate notification:', error);
    }
  };

  const testScheduledNotification = async () => {
    try {
      await NotificationService.scheduleLocalNotification(
        'Scheduled Notification',
        'This notification was scheduled to appear 5 seconds later!',
        { seconds: 5 }
      );
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const cancelAllNotifications = async () => {
    try {
      await NotificationService.cancelAllNotifications();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  };

  return (
    <Card style={styles.container}>
      <Card.Title title="Notification Testing" />
      <Card.Content>
        <Button mode="contained" onPress={testImmediateNotification} style={styles.button}>
          Send Immediate Notification
        </Button>
        <Button mode="contained" onPress={testScheduledNotification} style={styles.button}>
          Schedule Notification (5s)
        </Button>
        <Button mode="outlined" onPress={cancelAllNotifications} style={styles.button}>
          Cancel All Notifications
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  button: {
    marginVertical: 8,
  },
});
