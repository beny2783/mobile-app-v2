import React from 'react';
import { View, Text, Button, Image, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      {user?.user_metadata?.avatar_url && (
        <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatar} />
      )}
      <Text style={styles.name}>{user?.user_metadata?.full_name}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
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
