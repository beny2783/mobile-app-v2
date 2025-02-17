import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
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
import { NotificationTest } from '../components/NotificationTest';
import HomeHeader from '../components/HomeHeader';
import SummaryCards from '../components/SummaryCards';
import BankCard from '../components/BankCard';
import { createBalanceRepository, GroupedBalances } from '../repositories/balance';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type HomeScreenNavigationProp = NativeStackNavigationProp<AppTabParamList, 'Home'>;
type HomeScreenRouteProp = RouteProp<AppTabParamList, 'Home'>;

// Initialize repository once, outside component
const balanceRepository = createBalanceRepository();

export default function HomeScreen() {
  console.log('🏦 Rendering HomeScreen');

  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();
  const { trueLayerService } = useServices();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [groupedBalances, setGroupedBalances] = useState<GroupedBalances[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const {
    connections,
    loading: connectionLoading,
    error: connectionError,
    refresh: refreshConnections,
    disconnectBank,
  } = useBankConnections();

  // Log when connections change
  useEffect(() => {
    console.log('🔄 Bank connections updated:', {
      count: connections.length,
      status,
      error: connectionError,
      loading: connectionLoading,
    });
  }, [connections, status, connectionError, connectionLoading]);

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

            // Navigate to Transactions screen with refresh parameter
            navigation.navigate('Transactions', { refresh: true });
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

  const handleSearchPress = () => {
    setIsSearchVisible(true);
    // TODO: Implement search functionality
  };

  const handleAddPress = () => {
    handleBankConnection();
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const fetchBalances = async () => {
    try {
      console.log('🏦 HomeScreen: Fetching grouped balances...');
      const balances = await balanceRepository.getGroupedBalances();
      console.log(`✅ HomeScreen: Found ${balances.length} bank connections`);

      setGroupedBalances(balances);
      setError(null);
    } catch (err) {
      console.error('❌ HomeScreen: Error fetching balances:', err);
      setError('Failed to load balances');
      setGroupedBalances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const onRefresh = () => {
    console.log('🔄 HomeScreen: Refreshing data...');
    setRefreshing(true);
    fetchBalances();
  };

  // Calculate total balances and monthly spend
  const personalAccounts = groupedBalances.filter(
    (group) => !group.connection.bank_name?.toLowerCase().includes('joint')
  );
  const jointAccounts = groupedBalances.filter((group) =>
    group.connection.bank_name?.toLowerCase().includes('joint')
  );

  const calculateTotalBalance = (groups: GroupedBalances[]) =>
    groups.reduce(
      (total, group) => total + group.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0),
      0
    );

  const personalBalance = calculateTotalBalance(personalAccounts);
  const jointBalance = calculateTotalBalance(jointAccounts);

  // TODO: Calculate actual monthly spend from transactions
  const monthlySpend = 1288.4;

  if (loading) {
    return (
      <View style={styles.container}>
        <HomeHeader
          onSearchPress={handleSearchPress}
          onAddPress={handleAddPress}
          onProfilePress={handleProfilePress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HomeHeader
        onSearchPress={handleSearchPress}
        onAddPress={handleAddPress}
        onProfilePress={handleProfilePress}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SummaryCards
          personalBalance={personalBalance}
          jointBalance={jointBalance}
          monthlySpend={monthlySpend}
        />

        {groupedBalances.map((group) => (
          <BankCard
            key={group.connection.id}
            bankName={group.connection.bank_name || 'Connected Bank'}
            accounts={group.accounts}
            onRefresh={onRefresh}
            onDisconnect={() => handleDisconnectBank(group.connection.id)}
            connectionId={group.connection.id}
          />
        ))}

        {groupedBalances.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No accounts found</Text>
            <Text style={styles.emptySubtext}>Connect a bank account to see your balances</Text>
          </View>
        )}

        <View style={styles.notificationTestContainer}>
          <NotificationTest />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  notificationTestContainer: {
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
});
