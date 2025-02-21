import React, { useEffect, useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import { useServices } from '../contexts/ServiceContext';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  console.log('🏦 Rendering HomeScreen');
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { trueLayerService } = useServices();
  const [connecting, setConnecting] = useState(false);

  const {
    connections,
    connectionsLoading,
    connectionsError,
    loadConnections,
    loadAccountsByConnection,
  } = useAccounts();

  const totalBalance = useAppSelector(selectTotalBalance);

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

  // Load accounts whenever connections change
  useEffect(() => {
    const loadAccounts = async () => {
      if (connections.length > 0) {
        try {
          console.log(`📊 Loading accounts for ${connections.length} connections...`);
          await Promise.all(connections.map((conn) => loadAccountsByConnection(conn.id)));
        } catch (error) {
          console.error('Failed to load accounts:', error);
        }
      }
    };
    loadAccounts();
  }, [connections, loadAccountsByConnection]);

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
  notificationTestContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
