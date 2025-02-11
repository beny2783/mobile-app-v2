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

      if (!clientId || !redirectUri) {
        return new Response(
          JSON.stringify({
            error: 'Configuration error',
            details: 'Missing required credentials',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      const authUrl = new URL('https://auth.truelayer-sandbox.com/connect/auth');
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('scope', 'info accounts balance cards transactions');
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('providers', 'uk-ob-all uk-oauth-all');

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
