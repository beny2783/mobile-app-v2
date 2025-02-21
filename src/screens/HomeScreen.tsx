import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { NotificationTest } from '../components/NotificationTest';
import HomeHeader from '../components/HomeHeader';
import SummaryCards from '../components/SummaryCards';
import BankCard from '../components/BankCard';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAccounts } from '../hooks/useAccounts';
import { useAppSelector } from '../store/hooks';
import { selectTotalBalance } from '../store/slices/accountsSlice';
import { colors } from '../constants/theme';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  console.log('🏦 Rendering HomeScreen');
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const {
    connections,
    connectionsLoading,
    connectionsError,
    loadConnections,
    loadAccountsByConnection,
  } = useAccounts();

  const totalBalance = useAppSelector(selectTotalBalance);

  // Load connections and their accounts on mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        await loadConnections();
        // Load accounts for each connection
        await Promise.all(connections.map((conn) => loadAccountsByConnection(conn.id)));
      } catch (error) {
        console.error('Failed to load all data:', error);
      }
    };
    loadAllData();
  }, [loadConnections, loadAccountsByConnection]);

  const handleSearchPress = () => {
    // TODO: Implement search functionality
  };

  const handleAddPress = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ConnectBank',
      })
    );
  };

  const handleProfilePress = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Profile',
      })
    );
  };

  const handleRefresh = async () => {
    try {
      await loadConnections();
      await Promise.all(connections.map((conn) => loadAccountsByConnection(conn.id)));
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  // TODO: Implement joint balance and monthly spend calculations
  const jointBalance = 0;
  const monthlySpend = 0;

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={connectionsLoading} message="Loading your accounts..." />
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
  emptyContainer: {
    padding: 24,
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
    margin: 16,
    padding: 16,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 14,
  },
  notificationTestContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
});
