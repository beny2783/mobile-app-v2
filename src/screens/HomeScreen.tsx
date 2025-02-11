import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Avatar, Button, Text, Card, IconButton } from 'react-native-paper';
import { colors } from '../constants/theme';
import AccountCard from '../components/AccountCard';
import { TrueLayerService } from '../services/trueLayer';
import { TRUELAYER } from '../constants';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const trueLayer = new TrueLayerService({
        clientId: TRUELAYER.CLIENT_ID,
        redirectUri: TRUELAYER.REDIRECT_URI,
      });

      const { accounts: accountsData, balances } = await trueLayer.getBalances();
      setAccounts(
        accountsData.results.map((account: any, index: number) => ({
          ...account,
          balance: balances[index].current,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Avatar.Text
          size={40}
          label={user?.email?.[0].toUpperCase() || 'U'}
          style={styles.avatar}
        />
      </View>
      <View style={styles.headerRight}>
        <Button mode="contained" style={styles.upgradeButton} icon="star">
          Upgrade
        </Button>
        <IconButton icon="gift-outline" />
        <IconButton icon="magnify" />
        <IconButton icon="plus" />
      </View>
    </View>
  );

  const renderCreditScore = () => (
    <Card style={styles.creditScoreCard}>
      <Card.Title
        title="Check your credit score"
        subtitle="Your monthly update is ready"
        left={(props) => (
          <Avatar.Icon {...props} icon="chart-line" style={styles.creditScoreIcon} />
        )}
      />
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  if (accounts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        {renderHeader()}
        <Text variant="headlineSmall" style={styles.title}>
          Welcome!
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Connect your bank account to get started
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('ConnectBank')}
          style={styles.button}
        >
          Connect Bank
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {renderHeader()}
      {renderCreditScore()}

      {accounts.map((account) => (
        <AccountCard
          key={account.account_id}
          name={account.display_name}
          balance={account.balance}
          accountNumber={account.account_number?.number}
          sortCode={account.account_number?.sort_code}
          color={account.provider.logo_uri ? undefined : colors.primary}
          logo={account.provider.logo_uri}
          overdraftLimit={account.overdraft}
        />
      ))}

      <Card style={styles.activityCard}>
        <Card.Title title="Activity" />
        <Card.Content>
          <Text variant="bodyMedium" style={styles.noActivity}>
            No recent activity
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  upgradeButton: {
    marginRight: 8,
    backgroundColor: colors.surface,
  },
  creditScoreCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
  },
  creditScoreIcon: {
    backgroundColor: colors.primary,
  },
  activityCard: {
    margin: 16,
    backgroundColor: colors.surface,
  },
  noActivity: {
    color: colors.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    marginTop: 16,
  },
});
