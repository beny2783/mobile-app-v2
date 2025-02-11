import { Platform } from 'react-native';

export const setupErrorHandling = () => {
  if (Platform.OS === 'web') {
    window.onerror = (message, source, lineno, colno, error) => {
      console.log('Global Error:', {
        message,
        source,
        lineno,
        colno,
        error: error?.toString(),
        stack: error?.stack,
      });
    };

    window.addEventListener('unhandledrejection', (event) => {
      console.log('Unhandled Promise Rejection:', {
        reason: event.reason,
        stack: event.reason?.stack,
      });
    });
  } else {
    // For native platforms, use ErrorUtils
    const ErrorUtils = global.ErrorUtils;
    if (ErrorUtils) {
      const originalHandler = ErrorUtils.getGlobalHandler();

      ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.log('Global Error:', {
          error: error?.toString(),
          stack: error?.stack,
          isFatal,
        });

        originalHandler(error, isFatal);
      });
    }
  }
};
