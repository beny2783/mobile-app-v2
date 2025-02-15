import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { useServices } from '../contexts/ServiceContext';
import { useBankConnections } from '../hooks/useBankConnections';
import * as WebBrowser from 'expo-web-browser';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { AppTabParamList } from '../types/navigation';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type ConnectBankScreenNavigationProp = NativeStackNavigationProp<AppTabParamList, 'ConnectBank'>;
type ConnectBankScreenRouteProp = RouteProp<AppTabParamList, 'ConnectBank'>;

export default function ConnectBankScreen() {
  console.log('🏦 Rendering ConnectBankScreen');

  const navigation = useNavigation<ConnectBankScreenNavigationProp>();
  const route = useRoute<ConnectBankScreenRouteProp>();
  const { trueLayerService } = useServices();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const {
    connections,
    loading,
    error: connectionError,
    refresh: refreshConnections,
    refreshing,
    disconnectBank,
  } = useBankConnections();

  // Log when connections change
  useEffect(() => {
    console.log('🔄 Bank connections updated:', {
      count: connections.length,
      status,
      error: connectionError,
      loading,
      refreshing,
    });
  }, [connections, status, connectionError, loading, refreshing]);

  useEffect(() => {
    console.log('📝 Route params changed:', route.params);
    const init = async () => {
      try {
        // Check for success/error from callback first
        if (route.params?.success) {
          console.log('✅ Bank connection successful');
          setStatus('connected');
          await refreshConnections();
          return;
        }

        if (route.params?.error) {
          console.log('❌ Bank connection error:', route.params.error);
          setError(route.params.error);
          setStatus('error');
          return;
        }
      } catch (error) {
        console.error('❌ Failed to initialize:', error);
        setError('Failed to check bank connection');
        setStatus('error');
      }
    };

    init();
  }, [route.params, refreshConnections]);

  const handleBankConnection = async () => {
    console.log('🔄 Starting bank connection process...');
    setError(null);
    setStatus('connecting');

    try {
      const authUrl = trueLayerService.getAuthUrl();
      console.log('🔗 Generated auth URL');

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'spendingtracker://auth/callback'
      );
      console.log('📱 Browser session result:', result.type);

      if (result.type === 'success') {
        const url = result.url;
        const code = new URL(url).searchParams.get('code');

        if (code) {
          console.log('🔑 Received auth code, exchanging...');
          try {
            await trueLayerService.exchangeCode(code);
            console.log('✅ Code exchange successful');

            // Ensure connections are refreshed before proceeding
            console.log('🔄 Refreshing bank connections...');
            await refreshConnections();
            console.log('✅ Bank connections refreshed');

            setStatus('connected');
            navigation.navigate('Transactions');
          } catch (exchangeError) {
            console.error('❌ Code exchange failed:', exchangeError);
            setError('Failed to complete bank connection');
            setStatus('error');
          }
        }
      } else {
        console.log('❌ Bank connection cancelled or failed');
        setError('Bank connection cancelled or failed');
        setStatus('error');
      }

      await WebBrowser.coolDownAsync();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error connecting bank:', error);
      setError(`Failed to connect to bank: ${errorMessage}`);
      setStatus('error');
    }
  };

  const handleDisconnectBank = async (connectionId: string) => {
    console.log('🔄 Disconnecting bank:', connectionId);
    try {
      setError(null);
      await disconnectBank(connectionId);
      console.log('✅ Bank disconnected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error disconnecting bank:', error);
      setError(`Failed to disconnect bank: ${errorMessage}`);
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
          <Text style={styles.sectionTitle}>Connected Banks ({connections.length})</Text>
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
                        `${connection.provider.charAt(0).toUpperCase()}${connection.provider.slice(1)} Bank ${connections.length > 1 ? connection.id.slice(-4) : ''}`}
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
          onPress={handleBankConnection}
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
