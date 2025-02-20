import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Provider } from 'react-redux';
// import * as ExpoNotifications from 'expo-notifications';
import { RootStackParamList } from './src/navigation/types';
import AuthScreen from './src/screens/AuthScreen';
import { ServiceProvider } from './src/contexts/ServiceContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { setupErrorHandling } from './src/utils/errorHandling';
import { linking } from './src/navigation/linking';
import store from './src/store';
import { GlobalLoadingIndicator } from './src/components/common/GlobalLoadingIndicator';
// import { NotificationService } from './src/services/NotificationService';
import { useAuth } from './src/store/slices/auth/hooks';

const Stack = createNativeStackNavigator<RootStackParamList>();

const LoadingSpinner = () => (
  <ActivityIndicator size={Platform.OS === 'ios' ? 'large' : 48} color="#87CEEB" />
);

function Navigation() {
  const { user, loading, checkUser } = useAuth();

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
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
  // const notificationListener = useRef<ExpoNotifications.Subscription>();
  // const responseListener = useRef<ExpoNotifications.Subscription>();

  // useEffect(() => {
  //   async function setupNotifications() {
  //     try {
  //       // Register for push notifications
  //       await NotificationService.registerForPushNotifications();

  //       // Listen for incoming notifications while the app is foregrounded
  //       notificationListener.current = NotificationService.addNotificationReceivedListener(
  //         (notification) => {
  //           console.log('Notification received:', notification);
  //         }
  //       );

  //       // Listen for user interaction with notifications
  //       responseListener.current = NotificationService.addNotificationResponseReceivedListener(
  //         (response) => {
  //           console.log('Notification response received:', response);
  //         }
  //       );
  //     } catch (error) {
  //       console.error('Error setting up notifications:', error);
  //     }
  //   }

  //   setupNotifications();

  //   // Cleanup
  //   return () => {
  //     if (notificationListener.current) {
  //       NotificationService.removeNotificationSubscription(notificationListener.current);
  //     }
  //     if (responseListener.current) {
  //       NotificationService.removeNotificationSubscription(responseListener.current);
  //     }
  //   };
  // }, []);

  if (__DEV__) {
    setupErrorHandling();
  }

  return (
    <Provider store={store}>
      <ServiceProvider>
        <NavigationContainer
          linking={linking}
          fallback={
            <View style={styles.loadingContainer}>
              <LoadingSpinner />
            </View>
          }
        >
          <View style={styles.container}>
            <StatusBar style="auto" />
            <Navigation />
            <GlobalLoadingIndicator />
          </View>
        </NavigationContainer>
      </ServiceProvider>
    </Provider>
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
