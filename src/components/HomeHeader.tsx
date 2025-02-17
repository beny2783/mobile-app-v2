import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../constants/theme';

interface HomeHeaderProps {
  onSearchPress?: () => void;
  onAddPress?: () => void;
  onProfilePress?: () => void;
}

export default function HomeHeader({ onSearchPress, onAddPress, onProfilePress }: HomeHeaderProps) {
  const { user } = useAuth();
  const userInitial = user?.email?.[0]?.toUpperCase() || 'B';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Left: Profile Button */}
      <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
        <Text style={styles.profileInitial}>{userInitial}</Text>
      </TouchableOpacity>

      {/* Right: Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onSearchPress}>
          <Ionicons name="search" size={24} color={colors.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.addButton]} onPress={onAddPress}>
          <Ionicons name="add" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: colors.primary,
  },
});
