import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Avatar } from 'react-native-paper';
import { useAuth } from '../store/slices/auth/hooks';
import { colors } from '../constants/theme';
import TotalBalance from '../components/TotalBalance';
import BalanceGraph from '../components/BalanceGraph';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={64}
          label={user?.email?.[0].toUpperCase() || '?'}
          style={styles.avatar}
        />
        <Text variant="titleLarge" style={styles.email}>
          {user?.email}
        </Text>
        <Button mode="outlined" onPress={signOut} style={styles.signOutButton}>
          Sign Out
        </Button>
      </View>

      <View style={styles.content}>
        <TotalBalance />
        <BalanceGraph />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    marginBottom: 12,
    backgroundColor: colors.primary,
  },
  email: {
    color: colors.text.primary,
    marginBottom: 16,
  },
  signOutButton: {
    borderColor: colors.border,
  },
  content: {
    flex: 1,
  },
});
