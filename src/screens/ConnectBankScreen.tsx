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
import { ConnectBankScreenProps } from '../navigation/navigationTypes';
import { supabase } from '../services/supabase';
import { Button } from 'react-native-paper';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Create TrueLayer service instance outside component
const trueLayer = new TrueLayerService({
  clientId: TRUELAYER.CLIENT_ID || '',
  redirectUri: TRUELAYER.REDIRECT_URI,
});

export default function ConnectBankScreen() {
  const navigation = useNavigation();
  const route = useRoute();
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
        .order('created_at', { ascending: false })
        .limit(1);

      if (dbError) {
        console.error('Failed to check bank connection:', dbError);
        setError('Failed to check bank connection');
        setStatus('error');
        setLoading(false);
        return;
      }

      if (connections && connections.length > 0) {
        addDebugInfo('Found active bank connection');
        setStatus('connected');
        setConnectionId(connections[0].id);
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
            setStatus('connected');
            // Refresh connection status
            checkBankConnection();
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
    }
  };

  const handleDisconnectBank = async () => {
    try {
      setLoading(true);
      setError(null);
      addDebugInfo('Starting bank disconnection process');

      if (!connectionId) {
        throw new Error('No active connection found');
      }

      await trueLayer.disconnectBank(connectionId);

      // Clear transactions from state
      const {
        data: { user },
        error: deleteError,
      } = await supabase.auth.getUser();
      if (deleteError) {
        console.error('Error deleting transactions:', deleteError);
        throw new Error('Failed to delete transactions');
      }

      addDebugInfo(`Deleting transactions for user: ${user.id}`);
      const { error: transactionError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      if (transactionError) {
        addDebugInfo(`Error deleting transactions: ${JSON.stringify(transactionError)}`);
        throw new Error('Failed to delete transactions');
      }

      addDebugInfo('Transactions deleted successfully');
      setStatus('disconnected');
      setConnectionId(null);
      addDebugInfo('Bank disconnected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugInfo(`Error: ${errorMessage}`);
      console.error('Error disconnecting bank:', error);
      setError(`Failed to disconnect bank: ${errorMessage}`);
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
    fontFamily: 'monospace',
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
