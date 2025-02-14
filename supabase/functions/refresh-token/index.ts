// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    if (req.method === 'POST') {
      const { refresh_token } = await req.json();

      // Enhanced validation
      console.log('🔄 Starting token refresh...', {
        hasRefreshToken: !!refresh_token,
        hasClientId: !!Deno.env.get('TRUELAYER_CLIENT_ID'),
        hasClientSecret: !!Deno.env.get('TRUELAYER_CLIENT_SECRET'),
      });

      if (!refresh_token) {
        console.error('❌ Missing refresh token');
        return new Response(JSON.stringify({ error: 'Refresh token is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      if (!Deno.env.get('TRUELAYER_CLIENT_ID') || !Deno.env.get('TRUELAYER_CLIENT_SECRET')) {
        console.error('❌ Missing TrueLayer credentials');
        return new Response(JSON.stringify({ error: 'TrueLayer credentials not configured' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const tokenUrl = 'https://auth.truelayer-sandbox.com/connect/token';
      const requestBody = {
        grant_type: 'refresh_token',
        client_id: Deno.env.get('TRUELAYER_CLIENT_ID'),
        client_secret: Deno.env.get('TRUELAYER_CLIENT_SECRET'),
        refresh_token,
      };

      console.log('📤 Making refresh token request...', {
        url: tokenUrl,
        clientIdPrefix: requestBody.client_id?.substring(0, 8),
        hasClientSecret: !!requestBody.client_secret,
        refreshTokenPrefix: refresh_token?.substring(0, 8),
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          'X-Debug': 'true',
          'X-TL-Environment': 'sandbox',
        },
        body: new URLSearchParams(requestBody).toString(),
      });

      const responseText = await response.text();
      console.log('📥 Raw response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
      });

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('❌ Failed to parse response:', error);
        return new Response(
          JSON.stringify({
            error: 'Invalid response format',
            details: responseText,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      if (!response.ok) {
        console.error('❌ Token refresh failed:', {
          status: response.status,
          error: data.error,
          description: data.error_description,
        });
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        });
      }

      console.log('✅ Token refresh successful');
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
