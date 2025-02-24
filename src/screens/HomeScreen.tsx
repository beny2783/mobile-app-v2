import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import HomeHeader from '../components/HomeHeader';
import SummaryCards from '../components/SummaryCards';
import BankCard from '../components/BankCard';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAccounts } from '../store/slices/accounts/hooks';
import { colors } from '../constants/theme';
import * as WebBrowser from 'expo-web-browser';
import { useServices } from '../contexts/ServiceContext';
import { RecentTransactions } from '../components/RecentTransactions';
import { useTransactions } from '../store/slices/transactions/hooks';
import { CategoriesModal } from '../components/CategoriesModal';
import { Ionicons } from '@expo/vector-icons';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  console.log('🏦 Rendering HomeScreen');
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { trueLayerService } = useServices();
  const [connecting, setConnecting] = useState(false);
  const [isCategoriesModalVisible, setIsCategoriesModalVisible] = useState(false);

  const {
    connections,
    connectionsLoading,
    connectionsError,
    loadConnections,
    loadAccountsByConnection,
    totalBalance,
  } = useAccounts();

  const { fetch: fetchTransactions } = useTransactions();

  // Load connections and their accounts on mount and when connections change
  useEffect(() => {
    const loadAllData = async () => {
      try {
        console.log('🔄 Loading bank connections and accounts...');
        await loadConnections();
      } catch (error) {
        console.error('Failed to load connections:', error);
      }
    };
    loadAllData();
  }, [loadConnections]);

  // Load accounts and transactions whenever connections change
  useEffect(() => {
    const loadData = async () => {
      if (connections.length > 0) {
        try {
          console.log(`📊 Loading accounts for ${connections.length} connections...`);
          await Promise.all(connections.map((conn) => loadAccountsByConnection(conn.id)));

          // Load transactions for all connections
          console.log('💰 Loading transactions...');
          await fetchTransactions({
            dateRange: {
              from: new Date(0).toISOString(), // Start from Unix epoch
              to: new Date().toISOString(), // Up to now
            },
          });
        } catch (error) {
          console.error('Failed to load data:', error);
        }
      }
    };
    loadData();
  }, [connections, loadAccountsByConnection, fetchTransactions]);

  const handleSearchPress = () => {
    // TODO: Implement search functionality
  };

  const handleAddPress = async () => {
    console.log('🔄 Starting bank connection process...');
    setConnecting(true);

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
        console.log('🔑 Received callback URL, navigating to Callback screen...');
        // Navigate to Callback screen
        navigation.navigate('Callback', { url });
      }

      await WebBrowser.coolDownAsync();
    } catch (error) {
      console.error('❌ Error connecting bank:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleProfilePress = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'AppTabs',
        params: {
          screen: 'Profile',
        },
      })
    );
  };

  const handleRefresh = async () => {
    try {
      await loadConnections();
      if (connections.length > 0) {
        await Promise.all([
          ...connections.map((conn) => loadAccountsByConnection(conn.id)),
          fetchTransactions({
            dateRange: {
              from: new Date(0).toISOString(),
              to: new Date().toISOString(),
            },
          }),
        ]);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  // TODO: Implement joint balance and monthly spend calculations
  const jointBalance = 0;
  const monthlySpend = 0;

  return (
    <View style={styles.container}>
      <LoadingOverlay
        visible={connectionsLoading || connecting}
        message="Loading your accounts..."
      />
      <HomeHeader
        onSearchPress={handleSearchPress}
        onAddPress={handleAddPress}
        onProfilePress={handleProfilePress}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={connectionsLoading} onRefresh={handleRefresh} />
        }
      >
        <SummaryCards
          personalBalance={totalBalance}
          jointBalance={jointBalance}
          monthlySpend={monthlySpend}
        />

        {connections.map((connection) => (
          <BankCard
            key={connection.id}
            bankName={connection.provider || 'Connected Bank'}
            connectionId={connection.id}
          />
        ))}

        {connections.length === 0 && !connectionsLoading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No accounts found</Text>
            <Text style={styles.emptySubtext}>Connect a bank account to see your balances</Text>
          </View>
        )}

        {connectionsError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading accounts: {connectionsError.message}</Text>
          </View>
        )}

        {connections.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity
                style={styles.categoriesButton}
                onPress={() => setIsCategoriesModalVisible(true)}
              >
                <Ionicons name="pricetags" size={20} color={colors.primary} />
                <Text style={styles.categoriesButtonText}>Categories</Text>
              </TouchableOpacity>
            </View>
            <RecentTransactions />
          </>
        )}
      </ScrollView>

      <CategoriesModal
        isVisible={isCategoriesModalVisible}
        onClose={() => setIsCategoriesModalVisible(false)}
      />
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
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: colors.error,
    borderRadius: 8,
  },
  errorText: {
    color: colors.text.inverse,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  categoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  categoriesButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});
