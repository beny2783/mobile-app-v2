import { TrueLayerService as NewTrueLayerService } from './trueLayer/index';
import type { TrueLayerConfig } from './trueLayer/types';
import { TRUELAYER } from '../constants';

class TrueLayerServiceSingleton extends NewTrueLayerService {
  private static instance: TrueLayerServiceSingleton | null = null;

  private constructor(config: TrueLayerConfig) {
    console.log('🔍 TrueLayer Service Creation: Using NEW implementation with separated services');
    super(config);
  }

  public static getInstance(): TrueLayerServiceSingleton {
    if (!TrueLayerServiceSingleton.instance) {
      TrueLayerServiceSingleton.instance = new TrueLayerServiceSingleton({
        clientId: TRUELAYER.CLIENT_ID || '',
        redirectUri: TRUELAYER.REDIRECT_URI,
      });
    }
    return TrueLayerServiceSingleton.instance;
  }
}

// Export a function to get the singleton instance
export const getTrueLayerService = () => TrueLayerServiceSingleton.getInstance();

// For backwards compatibility, also export the class name
export const TrueLayerService = TrueLayerServiceSingleton;
