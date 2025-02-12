export type AppTabParamList = {
  ConnectBank:
    | {
        success?: boolean;
        error?: string;
      }
    | undefined;
  Balances: undefined;
  Transactions: undefined;
  Profile: undefined;
  Callback: { url: string } | undefined;
};
