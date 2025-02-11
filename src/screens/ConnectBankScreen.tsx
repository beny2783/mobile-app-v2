import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { TrueLayerService } from '../services/trueLayer';
import { TRUELAYER } from '../constants';
import * as WebBrowser from 'expo-web-browser';
import { useRoute } from '@react-navigation/native';
import { ConnectBankScreenProps } from '../navigation/navigationTypes';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function ConnectBankScreen({ route }: ConnectBankScreenProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Add this function to log debug info
  const addDebugInfo = (info: string) => {
    setDebugInfo((prev) => `${prev}\n${new Date().toISOString()}: ${info}`);
    console.log(`Debug: ${info}`);
  };

  const trueLayer = new TrueLayerService({
    clientId: TRUELAYER.CLIENT_ID || '',
    redirectUri: TRUELAYER.REDIRECT_URI || '',
  });

  useEffect(() => {
    // Log environment info on mount
    addDebugInfo(`Environment: ${__DEV__ ? 'Development' : 'Production'}`);
    addDebugInfo(
      `TrueLayer Config: ${JSON.stringify(
        {
          clientId: TRUELAYER.CLIENT_ID ? 'provided' : 'missing',
          redirectUri: TRUELAYER.REDIRECT_URI,
        },
        null,
        2
      )}`
    );
  }, []);

  useEffect(() => {
    if (route.params?.error) {
      setError(route.params.error);
      setStatus('error');
      addDebugInfo(`Error from callback: ${route.params.error}`);
    }
    if (route.params?.success) {
      setStatus('connected');
      addDebugInfo('Bank connection successful');
      // TODO: Update UI to show success state
    }
  }, [route.params]);

  const handleConnectBank = async () => {
    try {
      setError(null);
      setStatus('connecting');
      addDebugInfo('Starting bank connection process');

      const authUrl = trueLayer.getAuthUrl();
      addDebugInfo(`Generated Auth URL: ${authUrl}`);

      if (typeof window !== 'undefined') {
        window.location.href = authUrl;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugInfo(`Error: ${errorMessage}`);
      console.error('Error connecting bank:', error);
      setError(`Failed to connect to bank: ${errorMessage}`);
      setStatus('error');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="wallet-outline" size={24} color={colors.primary} />
          <Text style={styles.title}>Connect Your Bank</Text>
        </View>

        <Text style={styles.description}>
          Connect your bank account to automatically track your spending and manage your finances.
        </Text>

        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, styles[status]]} />
          <Text style={styles.statusText}>
            {status === 'disconnected' && 'Not connected'}
            {status === 'connecting' && 'Connecting...'}
            {status === 'connected' && 'Connected'}
            {status === 'error' && 'Connection failed'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, status === 'connected' && styles.buttonDisabled]}
          onPress={handleConnectBank}
          disabled={status === 'connected'}
        >
          <Text style={styles.buttonText}>
            {status === 'connected' ? 'Connected' : 'Connect Bank'}
          </Text>
        </TouchableOpacity>
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {__DEV__ && (
        <ScrollView style={styles.debugContainer}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
    color: colors.text.primary,
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  disconnected: {
    backgroundColor: colors.text.secondary,
  },
  connecting: {
    backgroundColor: colors.secondary,
  },
  connected: {
    backgroundColor: colors.success,
  },
  error: {
    backgroundColor: colors.error,
  },
  statusText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    maxHeight: 200,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
});
