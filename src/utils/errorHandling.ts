export const setupErrorHandling = () => {
  if (typeof window !== 'undefined') {
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
  }
};
