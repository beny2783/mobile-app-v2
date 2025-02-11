// @ts-nocheck - Disable TypeScript checking for Deno imports
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface TokenRequest {
  code: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  error?: string;
}

serve(async (req: Request) => {
  // Enable CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Handle GET requests (health check)
    if (req.method === 'GET') {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Handle POST requests (actual token exchange)
    if (req.method === 'POST') {
      try {
        const { code } = await req.json();

        // Log environment variables (redacted)
        console.log('Environment check:', {
          hasClientId: !!Deno.env.get('TRUELAYER_CLIENT_ID'),
          hasClientSecret: !!Deno.env.get('TRUELAYER_CLIENT_SECRET'),
          hasRedirectUri: !!Deno.env.get('TRUELAYER_REDIRECT_URI'),
          redirectUri: Deno.env.get('TRUELAYER_REDIRECT_URI'),
        });

        if (!Deno.env.get('TRUELAYER_CLIENT_ID') || !Deno.env.get('TRUELAYER_CLIENT_SECRET')) {
          console.error('Missing required environment variables');
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

        if (!code) {
          return new Response(JSON.stringify({ error: 'Code is required' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        console.log('🔄 Exchanging code:', code.substring(0, 4) + '...');

        const response = await fetch('https://auth.truelayer-sandbox.com/connect/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: Deno.env.get('TRUELAYER_CLIENT_ID') || '',
            client_secret: Deno.env.get('TRUELAYER_CLIENT_SECRET') || '',
            code,
            redirect_uri: Deno.env.get('TRUELAYER_REDIRECT_URI') || '',
          }).toString(),
        });

        const data = await response.json();
        console.log('✅ Token exchange response:', {
          success: response.ok,
          status: response.status,
          hasAccessToken: !!data.access_token,
        });

        return new Response(JSON.stringify(data), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: response.ok ? 200 : 400,
        });
      } catch (error) {
        console.error('Request processing error:', {
          error,
          message: error.message,
          stack: error.stack,
        });
        return new Response(
          JSON.stringify({
            error: 'Failed to process request',
            details: error.message,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  } catch (error) {
    console.error('💥 Token exchange error:', error);
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
