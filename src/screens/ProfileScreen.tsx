import React from 'react';
import { View, Text, Button, Image, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../constants/theme';
import TotalBalance from '../components/TotalBalance';
import BalanceGraph from '../components/BalanceGraph';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileSection}>
        {user?.user_metadata?.avatar_url && (
          <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatar} />
        )}
        <Text style={styles.name}>{user?.user_metadata?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Button title="Sign Out" onPress={signOut} />
      </View>
      <TotalBalance />
      <BalanceGraph />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
});
