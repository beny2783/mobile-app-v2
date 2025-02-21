import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, List, Button } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../constants/theme';
import { AppTabParamList } from '../types/navigation';
import { useAccounts } from '../hooks/useAccounts';
import * as WebBrowser from 'expo-web-browser';
import { useAppDispatch } from '../store/hooks';
import { getAuthUrl } from '../store/slices/trueLayerSlice';

type NavigationProp = NativeStackNavigationProp<AppTabParamList>;

export const NoBankPrompt = () => {
  const [expanded, setExpanded] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { loadConnections: refreshConnections } = useAccounts();
  const route = useRoute();

  // Listen for navigation focus events to refresh connections
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Screen focused, refreshing connections...');
      refreshConnections();
    });

    return unsubscribe;
  }, [navigation, refreshConnections]);

  const handlePress = () => setExpanded(!expanded);

  const handleConnectBank = async () => {
    console.log('🔄 Starting bank connection process from prompt...');
    setConnecting(true);

    try {
      const authUrl = await dispatch(getAuthUrl()).unwrap();
      console.log('🔗 Generated auth URL');

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'spendingtracker://auth/callback'
      );
      console.log('📱 Browser session result:', result.type);

      if (result.type === 'success') {
        const url = result.url;
        console.log('🔑 Received callback URL, navigating to Callback screen...');
        // Navigate to Callback screen
        navigation.navigate('Callback', {
          url,
        });
      }

      await WebBrowser.coolDownAsync();
    } catch (error) {
      console.error('❌ Error connecting bank:', error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <List.Accordion
        title="No Bank Account Connected"
        description="Connect your bank account to see your financial data"
        expanded={expanded}
        onPress={handlePress}
        style={styles.accordion}
        titleStyle={styles.title}
        descriptionStyle={styles.description}
      >
        <View style={styles.content}>
          <Text style={styles.text}>
            To get started with tracking your spending and managing your finances, you'll need to
            connect at least one bank account.
          </Text>
          <Button
            mode="contained"
            onPress={handleConnectBank}
            loading={connecting}
            disabled={connecting}
            style={styles.button}
          >
            Connect Bank Account
          </Button>
        </View>
      </List.Accordion>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  accordion: {
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    color: colors.text.secondary,
  },
  content: {
    padding: 16,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
  },
});
