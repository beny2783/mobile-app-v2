import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppSelector } from '../../store/hooks';

export const GlobalLoadingIndicator: React.FC = () => {
  const isLoading = useAppSelector((state) => state.ui.isLoading);

  if (!isLoading) return null;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#87CEEB" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
});
