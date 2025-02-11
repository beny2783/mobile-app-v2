import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TrueLayerService } from '../services/trueLayer';
import { TRUELAYER } from '../constants';
import { AppNavigationProp } from '../navigation/navigationTypes';
import { colors } from '../constants/theme';

export default function CallbackScreen() {
  console.log('🎯 CallbackScreen mounted, URL:', window.location.href);
  const navigation = useNavigation<AppNavigationProp>();

  useEffect(() => {
    console.log('🔄 CallbackScreen effect running');
    const handleCallback = async () => {
      try {
        console.log('🔄 Starting callback handling...');

        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        console.log('📝 URL Parameters:', {
          code: code ? `${code.substring(0, 4)}...` : 'missing',
          error,
          errorDescription,
        });

        if (error) {
          console.error('❌ Error from TrueLayer:', { error, errorDescription });
          navigation.navigate('ConnectBank', { error: errorDescription || error });
          return;
        }

        if (!code) {
          console.error('❌ No authorization code found');
          navigation.navigate('ConnectBank', {
            error: 'No authorization code received',
          });
          return;
        }

        console.log('✅ Auth code received, initializing TrueLayer service...');
        const trueLayer = new TrueLayerService({
          clientId: TRUELAYER.CLIENT_ID || '',
          redirectUri: TRUELAYER.REDIRECT_URI || '',
        });

        console.log('🔑 Starting token exchange...');
        const tokenResponse = await trueLayer.exchangeCode(code);
        console.log('💫 Token exchange completed:', {
          access_token: tokenResponse.access_token ? 'present' : 'missing',
          refresh_token: tokenResponse.refresh_token ? 'present' : 'missing',
          expires_in: tokenResponse.expires_in,
          token_type: tokenResponse.token_type,
        });

        console.log('🎯 Navigating to ConnectBank with success...');
        navigation.navigate('ConnectBank', { success: true });
      } catch (error) {
        console.error('💥 Callback handling error:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        navigation.navigate('ConnectBank', {
          error: 'Failed to complete bank connection',
        });
      }
    };

    handleCallback();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text>Completing bank connection...</Text>
      <ActivityIndicator size={24} color={colors.primary} />
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
