import { TRUELAYER } from '../constants';
import { Platform } from 'react-native';

interface TrueLayerConfig {
  clientId: string;
  redirectUri: string;
  enableMock?: boolean;
}

export class TrueLayerService {
  private config: TrueLayerConfig;
  private baseUrl: string;
  private loginUrl: string;

  constructor(config: TrueLayerConfig) {
    this.config = config;
    // Use sandbox environment for development
    if (__DEV__) {
      this.baseUrl = 'https://auth.truelayer-sandbox.com';
      this.loginUrl = 'https://login-api.truelayer-sandbox.com';
    } else {
      this.baseUrl = 'https://auth.truelayer.com';
      this.loginUrl = 'https://login-api.truelayer.com';
    }
    console.log('TrueLayer Service Initialized:', {
      baseUrl: this.baseUrl,
      loginUrl: this.loginUrl,
      isDev: __DEV__,
      configProvided: {
        clientId: config.clientId ? 'provided' : 'missing',
        redirectUri: config.redirectUri ? 'provided' : 'missing',
      },
    });
  }

  getAuthUrl(): string {
    console.log('Building Auth URL with config:', {
      clientId: this.config.clientId ? 'provided' : 'missing',
      redirectUri: this.config.redirectUri,
      baseUrl: this.baseUrl,
    });

    // For sandbox testing, use their test bank
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'info accounts balance cards transactions',
      providers: 'mock', // Changed to just 'mock'
      enable_mock: 'true',
      disable_providers: 'true', // Added this to force mock provider
      enable_oauth_providers: 'false',
      enable_open_banking_providers: 'false', // Changed to false
      enable_credentials_sharing_providers: 'false',
      test_provider: 'mock', // Added test provider
    });

    if (__DEV__) {
      params.append('debug', 'true');
    }

    const url = `${this.baseUrl}/?${params.toString()}`;
    console.log('Final Auth URL:', url);
    return url;
  }

  async exchangeCode(code: string): Promise<any> {
    try {
      console.log('Exchanging code:', code);
      const response = await fetch(`${this.baseUrl}/connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: TRUELAYER.CLIENT_SECRET || '',
          code,
          redirect_uri: this.config.redirectUri,
        }).toString(),
      });

      const responseText = await response.text();
      console.log('Token response:', responseText);

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${responseText}`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }
}
