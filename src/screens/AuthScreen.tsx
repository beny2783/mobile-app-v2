import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../store/slices/auth/hooks';
import { colors } from '../constants/theme';

export default function AuthScreen() {
  const { signInWithGoogle, signInWithEmail, error, loading } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign in error:', error);
    }
  };

  const handleTestSignIn = async () => {
    try {
      await signInWithEmail({ email: 'test@example.com', password: 'testpass123' });
    } catch (error) {
      console.error('Test sign in error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Spending Tracker</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleGoogleSignIn}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <TouchableOpacity
          style={[styles.button, styles.testButton, loading && styles.buttonDisabled]}
          onPress={handleTestSignIn}
          disabled={loading}
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
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: colors.text.primary,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: colors.secondary,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: colors.error,
    marginBottom: 20,
    textAlign: 'center',
  },
});
