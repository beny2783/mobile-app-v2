export type AppTabParamList = {
  Home:
    | {
        success?: boolean;
        error?: string;
      }
    | undefined;
  Transactions: { refresh?: boolean } | undefined;
  Trends: undefined;
  Challenges: undefined;
  Profile: undefined;
  Callback: { url: string } | undefined;
};
