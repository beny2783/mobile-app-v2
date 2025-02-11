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

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner
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
      <NavigationContainer linking={linking}>
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
});
