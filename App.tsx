import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RootStackParamList } from './src/navigation/types';
import AuthScreen from './src/screens/AuthScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { setupErrorHandling } from './src/utils/errorHandling';
import { linking } from './src/navigation/linking';
import ErrorBoundary from './src/components/ErrorBoundary';
import { colors } from './src/constants/theme';
import { enableScreens } from 'react-native-screens';

// Disable native screens to avoid animation issues
enableScreens(false);

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: 'white' },
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        customAnimationOnGesture: false,
        animationTypeForReplace: 'push',
      }}
    >
      {!user ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{
            gestureEnabled: false,
            animation: 'none',
          }}
        />
      ) : (
        <Stack.Screen
          name="AppTabs"
          component={TabNavigator}
          options={{
            gestureEnabled: false,
            animation: 'none',
          }}
        />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  if (__DEV__) {
    setupErrorHandling();
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ErrorBoundary>
        <AuthProvider>
          <NavigationContainer
            linking={linking}
            theme={{
              colors: {
                background: 'white',
                card: 'white',
                text: colors.text.primary,
                border: colors.border,
                primary: colors.primary,
                notification: colors.error,
              },
              dark: false,
            }}
          >
            <Navigation />
          </NavigationContainer>
        </AuthProvider>
      </ErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
