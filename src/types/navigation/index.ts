export type AppTabParamList = {
  Home: undefined;
  ConnectBank: undefined;
  Balances: undefined;
  Transactions: {
    refresh?: boolean;
  };
  Budget: undefined;
  Trends: undefined;
  Challenges: undefined;
  Profile: undefined;
  Callback: { url: string } | undefined;
};
