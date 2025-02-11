import { Platform, LogBox } from 'react-native';

export function setupErrorHandling() {
  if (Platform.OS === 'web') {
    // Web-specific error handling
    if (typeof window !== 'undefined') {
      window.onerror = (message, source, lineno) => {
        console.log('Global Error:', {
          message,
          source,
          lineno,
        });
      };
    }
  } else {
    // React Native error handling
    const errorHandler = (error: Error, isFatal?: boolean) => {
      console.log('Global Error:', {
        isFatal,
        message: error.message,
        stack: error.stack,
      });
    };

    // Set the global error handler
    global.ErrorUtils?.setGlobalHandler(errorHandler);

    // Disable specific LogBox warnings
    LogBox.ignoreLogs([
      'Non-serializable values were found in the navigation state',
      'Sending `onAnimatedValueUpdate` with no listeners registered.',
      "[react-native-gesture-handler] Seems like you're using an old API with gesture components",
    ]);
  }
}
