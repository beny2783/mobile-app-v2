import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../App';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['spendingtracker://', 'http://localhost:19006', 'http://127.0.0.1:54321'],
  config: {
    screens: {
      Auth: 'auth',
      AuthCallback: 'auth/v1/authorize',
      Main: 'main',
      ConnectBank: 'connect-bank',
      Callback: 'auth/callback',
      AppTabs: 'app',
    },
  },
};
