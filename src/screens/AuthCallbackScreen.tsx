import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../services/supabase';

type RootStackParamList = {
  Auth: undefined;
  AuthCallback: undefined;
  Main: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AuthCallback'>;

export default function AuthCallbackScreen() {
  const navigation = useNavigation<NavigationProp>();

  React.useEffect(() => {
    // Just navigate back to Auth screen - the AuthContext will handle the session
    navigation.navigate('Auth');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
