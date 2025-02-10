import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TrueLayerService } from '../services/trueLayer';
import { TRUELAYER } from '../constants';
import { AppNavigationProp } from '../navigation/navigationTypes';

export default function CallbackScreen() {
  const navigation = useNavigation<AppNavigationProp>();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          console.error('TrueLayer auth error:', error);
          navigation.navigate('ConnectBank', { error });
          return;
        }

        if (code) {
          console.log('Received auth code:', code);
          const trueLayer = new TrueLayerService({
            clientId: TRUELAYER.CLIENT_ID || '',
            redirectUri: TRUELAYER.REDIRECT_URI || '',
          });

          const tokenResponse = await trueLayer.exchangeCode(code);
          console.log('Token exchange successful:', tokenResponse);

          navigation.navigate('ConnectBank', { success: true });
        }
      } catch (error) {
        console.error('Callback handling error:', error);
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
