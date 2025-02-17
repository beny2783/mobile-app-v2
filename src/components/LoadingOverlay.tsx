import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface LoadingOverlayProps {
  message?: string;
  visible: boolean;
}

export default function LoadingOverlay({ message = 'Loading...', visible }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name="cloud-download-outline"
          size={48}
          color={colors.primary}
          style={styles.icon}
        />
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: '80%',
  },
  icon: {
    marginBottom: 16,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    color: colors.text.primary,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});
