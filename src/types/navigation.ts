export type AppTabParamList = {
  ConnectBank:
    | {
        success?: boolean;
        error?: string;
      }
    | undefined;
  Balances: undefined;
  Transactions: { refresh?: boolean } | undefined;
  Trends: undefined;
  Challenges: undefined;
  Profile: undefined;
  Callback: { url: string } | undefined;
};
