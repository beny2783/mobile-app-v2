import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { TrueLayerService } from '../services/trueLayer';
import { TRUELAYER } from '../constants';
import * as WebBrowser from 'expo-web-browser';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { AppTabParamList } from '../types/navigation';
import { supabase } from '../services/supabase';
import { Button } from 'react-native-paper';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface BankConnection {
  id: string;
  provider: string;
  status: string;
  created_at: string;
  bank_name?: string;
  logo_url?: string;
  last_sync_status?: string;
  account_count?: number;
  last_sync?: string;
  bank_accounts?: { count: number }[];
}

// Create TrueLayer service instance outside component
const trueLayer = new TrueLayerService({
  clientId: TRUELAYER.CLIENT_ID || '',
  redirectUri: TRUELAYER.REDIRECT_URI,
});

type ConnectBankScreenNavigationProp = NativeStackNavigationProp<AppTabParamList, 'ConnectBank'>;
type ConnectBankScreenRouteProp = RouteProp<AppTabParamList, 'ConnectBank'>;

export default function ConnectBankScreen() {
  const navigation = useNavigation<ConnectBankScreenNavigationProp>();
  const route = useRoute<ConnectBankScreenRouteProp>();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep logging functionality but remove UI display
  const logDebugInfo = (info: string) => {
    if (__DEV__) {
      console.log(`Debug: ${info}`);
    }
  };

  useEffect(() => {
    // Log environment info on mount
    logDebugInfo(`Environment: ${__DEV__ ? 'Development' : 'Production'}`);
    logDebugInfo(
      `TrueLayer Config: ${JSON.stringify(
        {
          clientId: TRUELAYER.CLIENT_ID ? 'provided' : 'missing',
          redirectUri: TRUELAYER.REDIRECT_URI,
        },
        null,
        2
      )}`
    );
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check for success/error from callback first
        if (route.params?.success) {
          setStatus('connected');
          await checkBankConnection();
          setLoading(false);
          return;
        }

        if (route.params?.error) {
          setError(route.params.error);
          setStatus('error');
          setLoading(false);
          return;
        }

        // Then check current connection status
        await checkBankConnection();
      } catch (error) {
        console.error('Failed to initialize:', error);
        setError('Failed to check bank connection');
        setStatus('error');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [route.params]);

  const checkBankConnection = async () => {
    try {
      logDebugInfo('Checking bank connection status...');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      logDebugInfo(`User ID: ${user?.id}`);

      if (!user) {
        setError('Please log in first');
        setStatus('error');
        setLoading(false);
        return;
      }

      // Query active connections directly
      const { data: activeConnections, error: dbError } = await supabase
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

      if (dbError) {
        console.error('Failed to check bank connections:', dbError);
        setError('Failed to check bank connections');
        setStatus('error');
        setLoading(false);
        return;
      }

      if (activeConnections && activeConnections.length > 0) {
        logDebugInfo(`Found ${activeConnections.length} active bank connections`);
        // Transform the data to match the expected format
        const transformedConnections = activeConnections.map((conn) => ({
          ...conn,
          last_sync_status: !conn.last_sync
            ? 'pending'
            : new Date(conn.last_sync) < new Date(Date.now() - 24 * 60 * 60 * 1000)
              ? 'needs_update'
              : 'success',
          account_count: conn.bank_accounts?.[0]?.count || 0,
        }));
        setConnections(transformedConnections);
        setStatus('connected');
      } else {
        logDebugInfo('No active bank connections found');
        setStatus('disconnected');
        setConnections([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to check bank connections:', error);
      setError('Failed to check bank connections');
      setStatus('error');
      setLoading(false);
    }
  };

  const handleConnectBank = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus('connecting');
      logDebugInfo('Starting bank connection process');

      const authUrl = trueLayer.getAuthUrl();
      logDebugInfo(`Generated Auth URL: ${authUrl}`);

      await WebBrowser.warmUpAsync();

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'spendingtracker://auth/callback',
        {
          showInRecents: true,
          preferEphemeralSession: true,
        }
      );

      logDebugInfo(`WebBrowser result: ${JSON.stringify(result)}`);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (code) {
          logDebugInfo(`Got code: ${code.substring(0, 10)}...`);
          try {
            await trueLayer.exchangeCode(code);
            logDebugInfo('Code exchange successful');

            // Fetch initial transactions and balances
            logDebugInfo('Fetching initial data...');
            await Promise.all([trueLayer.fetchTransactions(), fetchAndStoreBalances()]);
            logDebugInfo('Initial data fetched successfully');

            await checkBankConnection();
            setStatus('connected');
            navigation.navigate('Transactions');
          } catch (exchangeError) {
            console.error('Code exchange failed:', exchangeError);
            setError('Failed to complete bank connection');
            setStatus('error');
          }
        }
      } else {
        setError('Bank connection cancelled or failed');
        setStatus('error');
      }

      await WebBrowser.coolDownAsync();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logDebugInfo(`Error: ${errorMessage}`);
      console.error('Error connecting bank:', error);
      setError(`Failed to connect to bank: ${errorMessage}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAndStoreBalances = async () => {
    try {
      logDebugInfo('Fetching balances...');
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('No authenticated user found');

      // Get current active connection
      const { data: connection } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .single();

      if (!connection) throw new Error('No active connection found');

      logDebugInfo(`Found active connection: ${connection.id}`);

      // Fetch balances from TrueLayer
      const { accounts, balances } = await trueLayer.getBalances();

      logDebugInfo('Raw balance data:');
      logDebugInfo(`Accounts: ${JSON.stringify(accounts.results, null, 2)}`);
      logDebugInfo(`Balances: ${JSON.stringify(balances, null, 2)}`);

      // Store balances in Supabase
      const balanceRecords = accounts.results.map((account: any, index: number) => {
        const record = {
          user_id: user.id,
          connection_id: connection.id,
          account_id: account.account_id,
          current: balances[index].current,
          available: balances[index].available,
          currency: balances[index].currency,
        };

        logDebugInfo(`Preparing balance record for account ${account.account_id}:`);
        logDebugInfo(JSON.stringify(record, null, 2));

        return record;
      });

      logDebugInfo(`Upserting ${balanceRecords.length} balance records...`);

      const { error: insertError } = await supabase.from('balances').upsert(balanceRecords, {
        onConflict: 'user_id,connection_id,account_id',
      });

      if (insertError) {
        logDebugInfo(`Error storing balances: ${insertError.message}`);
        throw insertError;
      }

      logDebugInfo('Balances stored successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logDebugInfo(`Error in fetchAndStoreBalances: ${errorMessage}`);
      console.error('Failed to fetch and store balances:', error);
      throw error;
    }
  };

  const handleDisconnectBank = async (connectionId: string) => {
    try {
      setLoading(true);
      setError(null);
      logDebugInfo('Starting bank disconnection process');

      await trueLayer.disconnectBank(connectionId);
      logDebugInfo('Bank disconnected and transactions cleared successfully');

      await checkBankConnection();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logDebugInfo(`Error: ${errorMessage}`);
      console.error('Error disconnecting bank:', error);
      setError(`Failed to disconnect bank: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#87CEEB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="wallet-outline" size={24} color="#87CEEB" />
        <Text style={styles.title}>Connect Your Banks</Text>
      </View>

      <Text style={styles.description}>
        Connect multiple bank accounts to automatically track your spending and manage your finances
        across all your accounts.
      </Text>

      {/* Connected Banks Section */}
      {connections.length > 0 && (
        <View style={styles.connectionsContainer}>
          <Text style={styles.sectionTitle}>Connected Banks</Text>
          {connections.map((connection) => (
            <View key={connection.id} style={styles.connectionCard}>
              <View style={styles.connectionHeader}>
                <View style={styles.bankInfo}>
                  <View style={styles.bankNameContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            connection.last_sync_status === 'success' ? '#4CAF50' : '#FFA726',
                        },
                      ]}
                    />
                    <Text style={styles.bankName}>
                      {connection.bank_name ||
                        `${connection.provider.charAt(0).toUpperCase()}${connection.provider.slice(1)} Bank`}
                    </Text>
                  </View>
                  <Text style={styles.connectionStatus}>
                    {connection.last_sync_status === 'success'
                      ? 'Connected'
                      : 'Connection needs update'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={() => handleDisconnectBank(connection.id)}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.connectionDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Accounts Connected:</Text>
                  <Text style={styles.detailValue}>
                    {connection.account_count}{' '}
                    {connection.account_count === 1 ? 'account' : 'accounts'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Updated:</Text>
                  <Text style={styles.detailValue}>
                    {connection.last_sync
                      ? new Date(connection.last_sync).toLocaleDateString()
                      : 'Never'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add New Bank Section */}
      <Text style={styles.sectionTitle}>Add Another Bank</Text>
      <View style={styles.addBankCard}>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleConnectBank}
          disabled={status === 'connecting'}
        >
          <View style={styles.connectButtonContent}>
            <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
            <Text style={styles.connectButtonText}>Connect Bank</Text>
          </View>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A2F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginLeft: 12,
    color: '#FFFFFF',
  },
  description: {
    fontSize: 16,
    color: '#A0A7B5',
    paddingHorizontal: 20,
    paddingBottom: 24,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  connectionsContainer: {
    marginBottom: 24,
  },
  connectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bankInfo: {
    flex: 1,
  },
  bankNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  bankName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0A1A2F',
  },
  connectionStatus: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 16,
  },
  connectionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    color: '#0A1A2F',
    fontWeight: '500',
  },
  disconnectButton: {
    backgroundColor: '#FF5252',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  addBankCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
  },
  connectButton: {
    backgroundColor: '#87CEEB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 14,
  },
});
