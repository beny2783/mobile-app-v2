import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const { signInWithGoogle } = useAuth();

  console.log('Rendering AuthScreen');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Spending Tracker</Text>
      <Button title="Sign in with Google" onPress={signInWithGoogle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
    textAlign: 'center',
  },
});
