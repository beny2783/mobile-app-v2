import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './screens/AuthScreen';
import { TabNavigator } from './navigation/TabNavigator';
import CallbackScreen from './screens/CallbackScreen';
import ConnectBankScreen from './screens/ConnectBankScreen';
import { StatusBar } from 'react-native';
import { colors } from './constants/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

function Navigation() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="ConnectBank" component={ConnectBankScreen} />
            <Stack.Screen name="Callback" component={CallbackScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  // Remove any window.addEventListener usage
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <Navigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
