import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  fetchConnections,
  disconnectBank,
  fetchAccountsByConnection,
  selectConnections,
  selectConnectionById,
  selectAccountsByConnection,
  selectConnectionsLoading,
  selectAccountsLoading,
  selectConnectionsError,
  selectAccountsError,
  selectTotalBalance,
  clearErrors,
} from '../accountsSlice';
import type { DatabaseBankAccount } from '../../../types/bank/database';
import type { BankConnectionWithAccounts } from '../../../types/bank/connection';

export function useAccounts() {
  const dispatch = useAppDispatch();

  // Selectors
  const connections = useAppSelector(selectConnections);
  const connectionsLoading = useAppSelector(selectConnectionsLoading);
  const connectionsError = useAppSelector(selectConnectionsError);
  const accountsLoading = useAppSelector(selectAccountsLoading);
  const accountsError = useAppSelector(selectAccountsError);
  const totalBalance = useAppSelector(selectTotalBalance);

  // Actions
  const loadConnections = useCallback(async () => {
    console.log('🔄 Loading bank connections...');
    try {
      const result = await dispatch(fetchConnections()).unwrap();
      console.log(`✅ Loaded ${result.length} bank connections`);
      return result;
    } catch (error) {
      console.error('❌ Failed to load connections:', error);
      throw error;
    }
  }, [dispatch]);

  const disconnectBankConnection = useCallback(
    async (connectionId: string) => {
      console.log(`🔄 Disconnecting bank connection: ${connectionId}`);
      try {
        await dispatch(disconnectBank(connectionId)).unwrap();
        console.log('✅ Bank disconnected successfully');
      } catch (error) {
        console.error('❌ Failed to disconnect bank:', error);
        throw error;
      }
    },
    [dispatch]
  );

  const loadAccountsByConnection = useCallback(
    async (connectionId: string) => {
      console.log(`🔄 Loading accounts for connection: ${connectionId}`);
      try {
        const result = await dispatch(fetchAccountsByConnection(connectionId)).unwrap();
        console.log(`✅ Loaded ${result.accounts.length} accounts`);
        return result.accounts;
      } catch (error) {
        console.error('❌ Failed to load accounts:', error);
        throw error;
      }
    },
    [dispatch]
  );

  const resetErrors = useCallback(() => {
    dispatch(clearErrors());
  }, [dispatch]);

  return {
    // State
    connections,
    connectionsLoading,
    connectionsError,
    accountsLoading,
    accountsError,
    totalBalance,

    // Actions
    loadConnections,
    disconnectBankConnection,
    loadAccountsByConnection,
    resetErrors,
  };
}

export function useConnection(connectionId: string) {
  const connection = useAppSelector((state) => selectConnectionById(state, connectionId));
  const accounts = useAppSelector((state) => selectAccountsByConnection(state, connectionId));
  const loading = useAppSelector(selectAccountsLoading);
  const error = useAppSelector(selectAccountsError);
  const dispatch = useAppDispatch();

  const loadAccounts = useCallback(async () => {
    console.log(`🔄 Loading accounts for connection: ${connectionId}`);
    try {
      const result = await dispatch(fetchAccountsByConnection(connectionId)).unwrap();
      console.log(`✅ Loaded ${result.accounts.length} accounts`);
      return result.accounts;
    } catch (error) {
      console.error('❌ Failed to load accounts:', error);
      throw error;
    }
  }, [dispatch, connectionId]);

  const disconnect = useCallback(async () => {
    console.log(`🔄 Disconnecting bank connection: ${connectionId}`);
    try {
      await dispatch(disconnectBank(connectionId)).unwrap();
      console.log('✅ Bank disconnected successfully');
    } catch (error) {
      console.error('❌ Failed to disconnect bank:', error);
      throw error;
    }
  }, [dispatch, connectionId]);

  return {
    connection,
    accounts,
    loading,
    error,
    loadAccounts,
    disconnect,
  };
}
