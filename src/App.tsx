import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3LightTheme, Portal } from 'react-native-paper';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './screens/AuthScreen';
import AuthCallbackScreen from './screens/AuthCallbackScreen';
import { TabNavigator } from './navigation/TabNavigator';
import CallbackScreen from './screens/CallbackScreen';
import ConnectBankScreen from './screens/ConnectBankScreen';
import { StatusBar } from 'react-native';
import { colors } from './constants/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { linking } from './navigation/linking';

export type RootStackParamList = {
  Auth: { error?: string };
  AuthCallback: { type: string; url?: string };
  Main: undefined;
  ConnectBank: undefined;
  Callback: undefined;
  AppTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
  const { user, error, signIn } = useAuth();

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={signIn}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
        </>
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
            <NavigationContainer linking={linking}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
