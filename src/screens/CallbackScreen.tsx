import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { TrueLayerService } from '../services/trueLayer';
import { TRUELAYER } from '../constants';

export default function CallbackScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Starting callback handling...');

        // Log the raw route params
        console.log('📝 Route params:', {
          params: route.params,
          hasUrl: !!route.params?.url,
        });

        const urlString = route.params?.url;
        if (!urlString) {
          console.error('❌ No URL in callback params');
          navigation.navigate('ConnectBank', { error: 'Missing callback URL' });
          return;
        }

        // Log the parsed URL details
        const url = new URL(urlString);
        console.log('🔍 Parsed callback URL:', {
          fullUrl: url.toString(),
          protocol: url.protocol,
          host: url.host,
          pathname: url.pathname,
          search: url.search,
          allParams: Object.fromEntries(url.searchParams.entries()),
        });

        const code = url.searchParams.get('code');
        console.log('🎫 Authorization code:', {
          hasCode: !!code,
          codeLength: code?.length,
          codePrefix: code?.substring(0, 10),
        });

        if (code) {
          // Log TrueLayer service initialization
          console.log('🔧 Initializing TrueLayer service:', {
            clientId: TRUELAYER.CLIENT_ID?.substring(0, 10) + '...',
            redirectUri: TRUELAYER.REDIRECT_URI,
            timestamp: Date.now(),
          });

          const trueLayer = new TrueLayerService({
            clientId: TRUELAYER.CLIENT_ID,
            redirectUri: TRUELAYER.REDIRECT_URI,
          });

          try {
            const result = await trueLayer.exchangeCode(code);
            console.log('✅ Code exchange successful:', {
              hasAccessToken: !!result?.access_token,
              hasRefreshToken: !!result?.refresh_token,
              expiresIn: result?.expires_in,
            });

            // Navigate back to ConnectBank screen with success
            navigation.navigate('ConnectBank', { success: true });
            return;
          } catch (exchangeError) {
            console.error('❌ Code exchange failed:', exchangeError);
            navigation.navigate('ConnectBank', {
              error:
                exchangeError instanceof Error
                  ? exchangeError.message
                  : 'Failed to exchange authorization code',
            });
            return;
          }
        }

        // Handle errors from TrueLayer
        const error = url.searchParams.get('error');
        if (error) {
          console.error('❌ Error from TrueLayer:', {
            error,
            description: url.searchParams.get('error_description'),
          });
          navigation.navigate('ConnectBank', {
            error: url.searchParams.get('error_description') || error,
          });
          return;
        }

        // If no code or error, go back to connect screen
        console.log('⚠️ No code or error in callback');
        navigation.navigate('ConnectBank');
      } catch (error) {
        console.error('💥 Failed to handle callback:', error);
        navigation.navigate('ConnectBank', {
          error: error instanceof Error ? error.message : 'Failed to complete connection',
        });
      }
    };

    handleCallback();
  }, [navigation, route.params]);

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
