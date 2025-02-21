import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { TrueLayerError } from '../../services/trueLayer/types';
import type { BankConnection, BankConnectionWithAccounts } from '../../types/bank/connection';
import type { DatabaseBankAccount } from '../../types/bank/database';
import { accountsAdapter } from '../../services/accounts/accountsAdapter';
import type { RootState } from '../index';

interface AccountsState {
  connections: {
    items: Record<string, BankConnectionWithAccounts>;
    loading: boolean;
    error: TrueLayerError | null;
  };
  accounts: {
    items: Record<string, DatabaseBankAccount>;
    byConnection: Record<string, string[]>;
    loading: boolean;
    error: TrueLayerError | null;
  };
  status: {
    lastSync: string | null;
    isRefreshing: boolean;
  };
}

const initialState: AccountsState = {
  connections: {
    items: {},
    loading: false,
    error: null,
  },
  accounts: {
    items: {},
    byConnection: {},
    loading: false,
    error: null,
  },
  status: {
    lastSync: null,
    isRefreshing: false,
  },
};

// Async Thunks
export const fetchConnections = createAsyncThunk(
  'accounts/fetchConnections',
  async (_, { rejectWithValue }) => {
    try {
      const connections = await accountsAdapter.getConnections();
      return connections;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const disconnectBank = createAsyncThunk(
  'accounts/disconnectBank',
  async (connectionId: string, { dispatch, rejectWithValue }) => {
    try {
      await accountsAdapter.disconnectBank(connectionId);
      // Refresh connections after disconnecting
      dispatch(fetchConnections());
      return connectionId;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchAccountsByConnection = createAsyncThunk(
  'accounts/fetchAccountsByConnection',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      const accounts = await accountsAdapter.getAccountsByConnection(connectionId);
      return { connectionId, accounts };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.connections.error = null;
      state.accounts.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Connections
    builder
      .addCase(fetchConnections.pending, (state) => {
        state.connections.loading = true;
        state.connections.error = null;
      })
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.connections.loading = false;
        state.connections.items = action.payload.reduce(
          (acc, connection) => {
            acc[connection.id] = connection;
            return acc;
          },
          {} as Record<string, BankConnectionWithAccounts>
        );
        state.status.lastSync = new Date().toISOString();
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.connections.loading = false;
        state.connections.error = action.payload as TrueLayerError;
      })

      // Disconnect Bank
      .addCase(disconnectBank.pending, (state) => {
        state.connections.loading = true;
        state.connections.error = null;
      })
      .addCase(disconnectBank.fulfilled, (state, action) => {
        state.connections.loading = false;
        const connectionId = action.payload;
        delete state.connections.items[connectionId];
        delete state.accounts.byConnection[connectionId];
        // Remove associated accounts
        if (state.accounts.byConnection[connectionId]) {
          state.accounts.byConnection[connectionId].forEach((accountId) => {
            delete state.accounts.items[accountId];
          });
        }
      })
      .addCase(disconnectBank.rejected, (state, action) => {
        state.connections.loading = false;
        state.connections.error = action.payload as TrueLayerError;
      })

      // Fetch Accounts by Connection
      .addCase(fetchAccountsByConnection.pending, (state) => {
        state.accounts.loading = true;
        state.accounts.error = null;
      })
      .addCase(fetchAccountsByConnection.fulfilled, (state, action) => {
        state.accounts.loading = false;
        const { connectionId, accounts } = action.payload;

        // Update accounts by connection mapping using database IDs
        state.accounts.byConnection[connectionId] = accounts.map(
          (account: DatabaseBankAccount) => account.id
        );

        // Update accounts items using database IDs
        accounts.forEach((account: DatabaseBankAccount) => {
          state.accounts.items[account.id] = account;
        });
      })
      .addCase(fetchAccountsByConnection.rejected, (state, action) => {
        state.accounts.loading = false;
        state.accounts.error = action.payload as TrueLayerError;
      });
  },
});

export const { clearErrors } = accountsSlice.actions;

// Memoized Selectors
const selectAccountsState = (state: RootState) => state.accounts;

export const selectConnections = createSelector(
  [(state: RootState) => state.accounts.connections.items],
  (items) => Object.values(items)
);

export const selectConnectionById = createSelector(
  [(state: RootState) => state.accounts.connections.items, (_, id: string) => id],
  (items, id) => items[id]
);

export const selectAccountsByConnection = createSelector(
  [
    (state: RootState) => state.accounts.accounts.items,
    (state: RootState) => state.accounts.accounts.byConnection,
    (_, connectionId: string) => connectionId,
  ],
  (accounts, byConnection, connectionId) => {
    const accountIds = byConnection[connectionId] || [];
    return accountIds.map((id) => accounts[id]).filter(Boolean);
  }
);

export const selectConnectionsLoading = createSelector(
  [selectAccountsState],
  (state) => state.connections.loading
);

export const selectAccountsLoading = createSelector(
  [selectAccountsState],
  (state) => state.accounts.loading
);

export const selectConnectionsError = createSelector(
  [selectAccountsState],
  (state) => state.connections.error
);

export const selectAccountsError = createSelector(
  [selectAccountsState],
  (state) => state.accounts.error
);

export const selectTotalBalance = createSelector(
  [
    (state: RootState) => state.accounts.connections.items,
    (state: RootState) => state.accounts.accounts.items,
    (state: RootState) => state.accounts.accounts.byConnection,
  ],
  (connections, accounts, byConnection) => {
    return Object.keys(connections).reduce((total, connectionId) => {
      const accountIds = byConnection[connectionId] || [];
      const connectionTotal = accountIds.reduce((sum, accountId) => {
        const account = accounts[accountId];
        return sum + (account?.balance || 0);
      }, 0);
      return total + connectionTotal;
    }, 0);
  }
);

export default accountsSlice.reducer;
