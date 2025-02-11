export const linking = {
  prefixes: ['http://localhost:19006', 'https://your-app.com'],
  config: {
    screens: {
      AppTabs: {
        screens: {
          Callback: 'auth/callback',
          ConnectBank: 'connect-bank',
          Main: '',
          Profile: 'profile',
        },
      },
      Auth: 'auth',
    },
  },
};
