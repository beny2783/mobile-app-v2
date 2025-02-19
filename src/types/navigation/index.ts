export type AppTabParamList = {
  ConnectBank: undefined;
  Balances: undefined;
  Transactions: {
    refresh?: boolean;
  };
  Profile: undefined;
  Callback: { url: string } | undefined;
};
