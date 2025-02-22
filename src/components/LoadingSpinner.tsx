import React from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { colors } from '../constants/theme';

export const LoadingSpinner: React.FC = () => (
  <ActivityIndicator size={Platform.OS === 'ios' ? 'large' : 48} color={colors.primary} />
);
