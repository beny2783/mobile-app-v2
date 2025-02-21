export type RootStackParamList = {
  Auth: { error?: string };
  AuthCallback: { type: string; url?: string };
  AppTabs: undefined;
  Home: {
    error?: string;
    success?: boolean;
  };
  Callback: {
    url?: string;
  };
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type AppTabParamList = {
  Home: {
    error?: string;
    success?: boolean;
  };
  Balances: undefined;
  Transactions: {
    refresh?: boolean;
  };
  Trends: undefined;
  Challenges: undefined;
  Profile: undefined;
  Callback: {
    url?: string;
  };
};

export type MainTabParamList = {
  Home: {
    error?: string;
    success?: boolean;
  };
  Transactions: {
    refresh?: boolean;
  };
  Settings: undefined;
};
