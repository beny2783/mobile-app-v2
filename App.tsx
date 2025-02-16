import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import { RootStackParamList } from './src/navigation/types';
import AuthScreen from './src/screens/AuthScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ServiceProvider } from './src/contexts/ServiceContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { setupErrorHandling } from './src/utils/errorHandling';
import { linking } from './src/navigation/linking';
import { NotificationService } from './src/services/NotificationService';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#87CEEB" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="AppTabs" component={TabNavigator} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Register for push notifications
    NotificationService.registerForPushNotifications().catch(console.error);

    // Listen for incoming notifications while the app is foregrounded
    notificationListener.current = NotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Listen for user interaction with notifications
    responseListener.current = NotificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response received:', response);
        // Handle notification interaction here
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  if (__DEV__) {
    setupErrorHandling();
  }

  return (
    <AuthProvider>
      <ServiceProvider>
        <NavigationContainer
          linking={linking}
          fallback={
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#87CEEB" />
            </View>
          }
        >
          <View style={styles.container}>
            <StatusBar style="auto" />
            <Navigation />
          </View>
        </NavigationContainer>
      </ServiceProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
