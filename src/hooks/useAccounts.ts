import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchConnections,
  disconnectBank,
  fetchAccountsByConnection,
  selectConnections,
  selectConnectionById,
  selectConnectionsLoading,
  selectAccountsLoading,
  selectConnectionsError,
  selectAccountsError,
} from '../store/slices/accountsSlice';
import type { DatabaseBankAccount } from '../types/bank/database';
import type { BankConnectionWithAccounts } from '../types/bank/connection';

export function useAccounts() {
  const dispatch = useAppDispatch();

  // Selectors
  const connections = useAppSelector(selectConnections);
  const connectionsLoading = useAppSelector(selectConnectionsLoading);
  const connectionsError = useAppSelector(selectConnectionsError);
  const accountsLoading = useAppSelector(selectAccountsLoading);
  const accountsError = useAppSelector(selectAccountsError);

  // Actions
  const loadConnections = useCallback(async () => {
    try {
      await dispatch(fetchConnections()).unwrap();
    } catch (error) {
      console.error('Failed to load connections:', error);
      throw error;
    }
  }, [dispatch]);

  const disconnectBankConnection = useCallback(
    async (connectionId: string) => {
      try {
        await dispatch(disconnectBank(connectionId)).unwrap();
      } catch (error) {
        console.error('Failed to disconnect bank:', error);
        throw error;
      }
    },
    [dispatch]
  );

  const loadAccountsByConnection = useCallback(
    async (connectionId: string) => {
      try {
        await dispatch(fetchAccountsByConnection(connectionId)).unwrap();
      } catch (error) {
        console.error('Failed to load accounts:', error);
        throw error;
      }
    },
    [dispatch]
  );

  return {
    // State
    connections,
    connectionsLoading,
    connectionsError,
    accountsLoading,
    accountsError,

    // Actions
    loadConnections,
    disconnectBankConnection,
    loadAccountsByConnection,
  };
}
