import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDataFetching } from './useDataFetching';
import { supabase } from '../services/supabase';
import { useServices } from '../contexts/ServiceContext';
import { authRepository } from '../repositories/auth';
import type { BankConnection } from '../services/trueLayer/types';

interface BankConnectionWithAccounts extends BankConnection {
  account_count?: number;
  last_sync_status?: 'pending' | 'needs_update' | 'success';
  bank_accounts?: { count: number }[];
}

export function useBankConnections() {
  console.log('🎣 useBankConnections: Hook initialized');

  const { trueLayerService } = useServices();
  const transformRef =
    useRef<(connections: BankConnectionWithAccounts[]) => BankConnectionWithAccounts[]>();

  const fetchConnections = useMemo(() => {
    console.log('🎣 useBankConnections: Creating fetch function');
    return async () => {
      console.log('📊 Fetching bank connections...');
      const user = await authRepository.getUser();
      if (!user) throw new Error('Authentication required');

      const { data: connections, error: dbError } = await supabase
        .from('bank_connections')
        .select(
          `
          *,
          bank_accounts:bank_accounts(count)
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .not('encrypted_access_token', 'is', null)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      console.log(`✅ Found ${connections?.length || 0} active connections:`, {
        connectionIds: connections?.map((c) => c.id),
        hasAccounts: connections?.map((c) => !!c.bank_accounts?.length),
      });
      return connections as BankConnectionWithAccounts[];
    };
  }, []);

  // Create transform function only once
  transformRef.current = useMemo(
    () => (connections: BankConnectionWithAccounts[]) => {
      console.log('🔄 Transforming connection data:', {
        count: connections.length,
        hasAccounts: connections.map((c) => !!c.bank_accounts?.length),
      });

      const transformed = connections.map((conn) => {
        let last_sync_status: 'pending' | 'needs_update' | 'success';

        if (!conn.last_sync) {
          last_sync_status = 'pending';
        } else if (new Date(conn.last_sync) < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
          last_sync_status = 'needs_update';
        } else {
          last_sync_status = 'success';
        }

        return {
          ...conn,
          last_sync_status,
          account_count: conn.bank_accounts?.[0]?.count || 0,
        };
      });

      console.log('✨ Transformation complete:', {
        count: transformed.length,
        statuses: transformed.map((t) => t.last_sync_status),
      });

      return transformed;
    },
    []
  );

  const handleError = useCallback((error: any) => {
    console.error('❌ Bank connection error:', error);
    // If it's a transaction storage error, we should retry the connection fetch
    // as the connection might have been created but failed during initialization
    if (error?.message?.includes('Failed to store transactions')) {
      console.log('🔄 Transaction storage error detected, will retry fetch');
      return;
    }
  }, []);

  const {
    data: connections,
    loading,
    error,
    fetch,
  } = useDataFetching<BankConnectionWithAccounts[]>([], fetchConnections, {
    transform: transformRef.current,
    retryOnError: true, // Enable retry for initialization errors
    onError: handleError,
  });

  const refresh = useCallback(async () => {
    console.log('🔄 useBankConnections: Starting refresh...');
    try {
      await fetch();
      console.log('✅ useBankConnections: Refresh completed successfully');
    } catch (error: unknown) {
      console.error('❌ useBankConnections: Refresh failed:', error);
      throw error;
    }
  }, [fetch]);

  // Perform initial fetch on mount only
  useEffect(() => {
    console.log('🎣 useBankConnections: Running mount effect');
    void refresh().catch((error: unknown) => {
      console.error('❌ useBankConnections: Initial fetch failed:', error);
    });
    return () => {
      console.log('🎣 useBankConnections: Cleanup mount effect');
    };
  }, [refresh]);

  const disconnectBank = useCallback(
    async (connectionId: string) => {
      console.log('🔌 useBankConnections: Disconnecting bank:', connectionId);
      try {
        await trueLayerService.disconnectBank(connectionId);
        console.log('✅ useBankConnections: Bank disconnected successfully');

        // Immediately refresh the connections list
        console.log('🔄 useBankConnections: Refreshing connections after disconnect');
        await refresh();
        console.log('✅ useBankConnections: Refresh after disconnect completed');
      } catch (error) {
        console.error('❌ useBankConnections: Failed to disconnect bank:', error);
        throw error;
      }
    },
    [trueLayerService, refresh]
  );

  console.log('🎣 useBankConnections: Returning state:', {
    connectionCount: connections.length,
    loading,
    error,
  });

  return {
    connections,
    loading,
    error,
    refresh,
    disconnectBank,
  };
}
