import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    if (req.method === 'GET') {
      const clientId = Deno.env.get('TRUELAYER_CLIENT_ID');
      const redirectUri = Deno.env.get('TRUELAYER_REDIRECT_URI');

      console.log('🔧 Environment check:', {
        hasClientId: !!Deno.env.get('TRUELAYER_CLIENT_ID'),
        hasClientSecret: !!Deno.env.get('TRUELAYER_CLIENT_SECRET'),
        hasRedirectUri: !!Deno.env.get('TRUELAYER_REDIRECT_URI'),
        env: Deno.env.toObject(),
      });

      console.log('Auth URL configuration:', {
        clientId: clientId ? clientId.substring(0, 10) + '...' : 'missing',
        redirectUri,
        isDev: true,
      });

      const authUrl = new URL('https://auth.truelayer-sandbox.com/connect/auth');
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', clientId || '');
      authUrl.searchParams.append('redirect_uri', redirectUri || '');
      authUrl.searchParams.append('scope', 'info accounts balance cards transactions');

      // Add sandbox-specific parameters
      authUrl.searchParams.append('providers', 'mock');
      authUrl.searchParams.append('enable_mock', 'true');
      authUrl.searchParams.append('disable_providers', 'true');
      authUrl.searchParams.append('enable_oauth_providers', 'false');
      authUrl.searchParams.append('enable_open_banking_providers', 'false');
      authUrl.searchParams.append('enable_credentials_sharing_providers', 'false');
      authUrl.searchParams.append('test_provider', 'mock');
      authUrl.searchParams.append('debug', 'true');

      console.log('🔍 Auth URL components:', {
        baseUrl: authUrl.origin,
        pathname: authUrl.pathname,
        params: Object.fromEntries(authUrl.searchParams.entries()),
        fullUrl: authUrl.toString(),
      });

      console.log('Generated auth URL:', authUrl.toString());

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
