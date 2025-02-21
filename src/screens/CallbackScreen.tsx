import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useEffect } from 'react';
import { getTrueLayerService } from '../services/trueLayer';
import { TRUELAYER } from '../constants';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppTabParamList } from '../types/navigation';
import { useAppDispatch } from '../store/hooks';
import { fetchConnections } from '../store/slices/accountsSlice';

type CallbackScreenNavigationProp = NativeStackNavigationProp<AppTabParamList>;
type CallbackScreenRouteProp = RouteProp<AppTabParamList, 'Callback'>;

export default function CallbackScreen() {
  const navigation = useNavigation<CallbackScreenNavigationProp>();
  const route = useRoute<CallbackScreenRouteProp>();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Starting callback handling...');

        // Get the URL from route params
        const urlString = route.params?.url;
        if (!urlString) {
          console.error('❌ No URL in callback params');
          navigation.navigate('Home', { error: 'Missing callback URL' });
          return;
        }

        // Parse the URL
        const url = new URL(urlString);
        const code = url.searchParams.get('code');

        if (code) {
          // Log TrueLayer service initialization
          console.log('🔧 Initializing TrueLayer service:', {
            clientId: TRUELAYER.CLIENT_ID?.substring(0, 10) + '...',
            redirectUri: TRUELAYER.REDIRECT_URI,
            timestamp: Date.now(),
          });

          const trueLayer = getTrueLayerService();

          try {
            await trueLayer.exchangeCode(code);
            console.log('✅ Code exchange successful');

            // Fetch updated connections after successful bank connection
            await dispatch(fetchConnections());
            console.log('✅ Connections updated in Redux store');

            // Navigate back to Home screen with success
            navigation.navigate('Home', { success: true });
            return;
          } catch (exchangeError) {
            console.error('❌ Code exchange failed:', exchangeError);
            navigation.navigate('Home', {
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
          navigation.navigate('Home', {
            error: url.searchParams.get('error_description') || error,
          });
          return;
        }

        // If no code or error, go back to home screen
        console.log('⚠️ No code or error in callback');
        navigation.navigate('Home', { error: 'Invalid callback URL' });
      } catch (error) {
        console.error('💥 Failed to handle callback:', error);
        navigation.navigate('Home', {
          error: error instanceof Error ? error.message : 'Failed to complete connection',
        });
      }
    };

    handleCallback();
  }, [navigation, dispatch, route.params]);

  return null;
}
