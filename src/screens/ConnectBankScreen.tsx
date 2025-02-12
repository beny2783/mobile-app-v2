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
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Add this function to log debug info
  const addDebugInfo = (info: string) => {
    setDebugInfo((prev) => `${prev}\n${new Date().toISOString()}: ${info}`);
    console.log(`Debug: ${info}`);
  };

  useEffect(() => {
    // Log environment info on mount
    addDebugInfo(`Environment: ${__DEV__ ? 'Development' : 'Production'}`);
    addDebugInfo(
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
        setLoading(false);
      }
    };

    init();
  }, [route.params]);

  const checkBankConnection = async () => {
    try {
      addDebugInfo('Checking bank connection status...');

      const {
        data: { user },
      } = await supabase.auth.getUser();
      addDebugInfo(`User ID: ${user?.id}`);

      if (!user) {
        setError('Please log in first');
        setStatus('error');
        setLoading(false);
        return;
      }

      // Check for active bank connection
      const { data: connections, error: dbError } = await supabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .not('encrypted_access_token', 'is', null) // Only get connections with tokens
        .order('created_at', { ascending: false })
        .limit(1)
        .single(); // Get single result to ensure we have exactly one or none

      if (dbError && dbError.code !== 'PGRST116') {
        // Ignore "no rows returned" error
        console.error('Failed to check bank connection:', dbError);
        setError('Failed to check bank connection');
        setStatus('error');
        setLoading(false);
        return;
      }

      if (connections) {
        addDebugInfo(`Found active bank connection: ${connections.id}`);
        setStatus('connected');
        setConnectionId(connections.id);
      } else {
        addDebugInfo('No active bank connection found');
        setStatus('disconnected');
        setConnectionId(null);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to check bank connection:', error);
      setError('Failed to check bank connection');
      setStatus('error');
      setLoading(false);
    }
  };

  const handleConnectBank = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus('connecting');
      addDebugInfo('Starting bank connection process');

      const authUrl = trueLayer.getAuthUrl();
      addDebugInfo(`Generated Auth URL: ${authUrl}`);

      await WebBrowser.warmUpAsync();

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'spendingtracker://auth/callback',
        {
          showInRecents: true,
          preferEphemeralSession: true,
        }
      );

      addDebugInfo(`WebBrowser result: ${JSON.stringify(result)}`);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (code) {
          addDebugInfo(`Got code: ${code.substring(0, 10)}...`);
          try {
            await trueLayer.exchangeCode(code);
            addDebugInfo('Code exchange successful');

            // Fetch initial transactions and balances
            addDebugInfo('Fetching initial data...');
            await Promise.all([trueLayer.fetchTransactions(), fetchAndStoreBalances()]);
            addDebugInfo('Initial data fetched successfully');

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
      addDebugInfo(`Error: ${errorMessage}`);
      console.error('Error connecting bank:', error);
      setError(`Failed to connect to bank: ${errorMessage}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAndStoreBalances = async () => {
    try {
      addDebugInfo('Fetching balances...');
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

      addDebugInfo(`Found active connection: ${connection.id}`);

      // Fetch balances from TrueLayer
      const { accounts, balances } = await trueLayer.getBalances();

      addDebugInfo('Raw balance data:');
      addDebugInfo(`Accounts: ${JSON.stringify(accounts.results, null, 2)}`);
      addDebugInfo(`Balances: ${JSON.stringify(balances, null, 2)}`);

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

        addDebugInfo(`Preparing balance record for account ${account.account_id}:`);
        addDebugInfo(JSON.stringify(record, null, 2));

        return record;
      });

      addDebugInfo(`Upserting ${balanceRecords.length} balance records...`);

      const { error: insertError } = await supabase.from('balances').upsert(balanceRecords, {
        onConflict: 'user_id,connection_id,account_id',
      });

      if (insertError) {
        addDebugInfo(`Error storing balances: ${insertError.message}`);
        throw insertError;
      }

      addDebugInfo('Balances stored successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugInfo(`Error in fetchAndStoreBalances: ${errorMessage}`);
      console.error('Failed to fetch and store balances:', error);
      throw error;
    }
  };

  const handleDisconnectBank = async () => {
    try {
      setLoading(true);
      setError(null);
      addDebugInfo('Starting bank disconnection process');

      // Get the latest connection ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');

      const { data: connection } = await supabase
        .from('bank_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('disconnected_at', null)
        .single();

      if (!connection) {
        throw new Error('No active connection found');
      }

      await trueLayer.disconnectBank(connection.id);
      addDebugInfo('Bank disconnected and transactions cleared successfully');

      setStatus('disconnected');
      setConnectionId(null);

      // Refresh the connection status
      await checkBankConnection();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugInfo(`Error: ${errorMessage}`);
      console.error('Error disconnecting bank:', error);
      setError(`Failed to disconnect bank: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="wallet-outline" size={24} color={colors.primary} />
          <Text style={styles.title}>Connect Your Bank</Text>
        </View>

        <Text style={styles.description}>
          Connect your bank account to automatically track your spending and manage your finances.
        </Text>

        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, styles[status]]} />
          <Text style={styles.statusText}>
            {status === 'disconnected' && 'Not connected'}
            {status === 'connecting' && 'Connecting...'}
            {status === 'connected' && 'Connected'}
            {status === 'error' && 'Connection failed'}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          {status === 'connected' ? (
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={handleDisconnectBank}
            >
              <Text style={styles.buttonText}>Disconnect Bank</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, status === 'connecting' && styles.buttonDisabled]}
              onPress={handleConnectBank}
              disabled={status === 'connecting'}
            >
              <Text style={styles.buttonText}>
                {status === 'connecting' ? 'Connecting...' : 'Connect Bank'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {__DEV__ && (
        <ScrollView style={styles.debugContainer}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
    color: colors.text.primary,
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  disconnected: {
    backgroundColor: colors.text.secondary,
  },
  connecting: {
    backgroundColor: colors.secondary,
  },
  connected: {
    backgroundColor: colors.success,
  },
  error: {
    backgroundColor: colors.error,
  },
  statusText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    maxHeight: 200,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    color: colors.text.secondary,
    padding: 16,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 16,
  },
  disconnectButton: {
    backgroundColor: colors.error,
  },
});
