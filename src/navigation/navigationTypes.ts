import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from './types';

export type AppNavigationProp = BottomTabNavigationProp<AppTabParamList>;

export type ConnectBankScreenProps = {
  navigation: AppNavigationProp;
  route: {
    params?: {
      error?: string;
      success?: boolean;
    };
  };
};
