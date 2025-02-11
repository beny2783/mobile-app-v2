export const linking = {
  prefixes: ['spendingtracker://', 'http://localhost:19006'],
  config: {
    screens: {
      AppTabs: {
        screens: {
          Callback: {
            path: 'auth/callback',
            parse: {
              url: (url: string) => url,
            },
          },
          ConnectBank: 'connect-bank',
          Main: '',
          Profile: 'profile',
        },
      },
      Auth: 'auth',
    },
  },
};
