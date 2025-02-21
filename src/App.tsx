import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3LightTheme, Portal } from 'react-native-paper';
import AuthScreen from './screens/AuthScreen';
import AuthCallbackScreen from './screens/AuthCallbackScreen';
import { TabNavigator } from './navigation/TabNavigator';
import CallbackScreen from './screens/CallbackScreen';
import { StatusBar } from 'expo-status-bar';
import { colors } from './constants/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { linking } from './navigation/linking';
import { Provider } from 'react-redux';
import { RootStackParamList } from './navigation/types';
import { ServiceProvider } from './contexts/ServiceContext';
import { setupErrorHandling } from './utils/errorHandling';
import { store } from './store';
import { GlobalLoadingIndicator } from './components/common/GlobalLoadingIndicator';
import { useAuth } from './store/slices/auth/hooks';

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

const LoadingSpinner = () => (
  <ActivityIndicator size={Platform.OS === 'ios' ? 'large' : 48} color="#87CEEB" />
);

function AppContent() {
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
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen
              name="AppTabs"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </View>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PaperProvider theme={theme}>
        <Portal.Host>
          <SafeAreaProvider>
            <ServiceProvider>
              <StatusBar style="dark" />
              <NavigationContainer linking={linking}>
                <View style={{ flex: 1 }}>
                  <AppContent />
                </View>
              </NavigationContainer>
            </ServiceProvider>
          </SafeAreaProvider>
        </Portal.Host>
      </PaperProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
