import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../constants/theme';

export default function AuthScreen() {
  const { signInWithGoogle, signInWithTestUser } = useAuth();

  const handleSignIn = async () => {
    try {
      console.log('Starting Google sign in...');
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleTestSignIn = async () => {
    try {
      console.log('Starting test user sign in...');
      await signInWithTestUser();
    } catch (error) {
      console.error('Test sign in error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Spending Tracker</Text>
      <TouchableOpacity style={styles.button} onPress={handleSignIn} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTestSignIn}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Sign in as Test User</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
