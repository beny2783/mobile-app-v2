export type RootStackParamList = {
  Auth: undefined;
  AppTabs: undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type AppTabParamList = {
  Main: undefined;
  ConnectBank: {
    error?: string;
    success?: boolean;
  };
  Profile: undefined;
  Callback: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Settings: undefined;
};
