import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { RootStackParamList } from './src/navigation/types';
import AuthScreen from './src/screens/AuthScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { setupErrorHandling } from './src/utils/errorHandling';
import { linking } from './src/navigation/linking';

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
  if (__DEV__) {
    setupErrorHandling();
  }

  return (
    <AuthProvider>
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
