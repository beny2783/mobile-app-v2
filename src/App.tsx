import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3LightTheme, Portal } from 'react-native-paper';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './screens/AuthScreen';
import { TabNavigator } from './navigation/TabNavigator';
import CallbackScreen from './screens/CallbackScreen';
import ConnectBankScreen from './screens/ConnectBankScreen';
import { StatusBar } from 'react-native';
import { colors } from './constants/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

// Define custom theme
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
    background: colors.background,
    surface: colors.surface,
  },
};

function Navigation() {
  const { user } = useAuth();

  return (
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
  );
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <Portal.Host>
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <NavigationContainer>
              <View style={{ flex: 1 }}>
                <Navigation />
              </View>
            </NavigationContainer>
          </AuthProvider>
        </SafeAreaProvider>
      </Portal.Host>
    </PaperProvider>
  );
}
