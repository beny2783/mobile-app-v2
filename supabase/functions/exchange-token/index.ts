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
        const { code, redirect_uri, client_id, timestamp } = await req.json();

        // Log complete request details
        console.log('📥 Full request details:', {
          code: code ? `${code.substring(0, 10)}...` : 'missing',
          redirect_uri,
          client_id: client_id ? `${client_id.substring(0, 10)}...` : 'missing',
          timestamp,
          headers: Object.fromEntries(req.headers.entries()),
          env: {
            client_id: Deno.env.get('TRUELAYER_CLIENT_ID')?.substring(0, 10) + '...',
            has_client_secret: !!Deno.env.get('TRUELAYER_CLIENT_SECRET'),
            redirect_uri: Deno.env.get('TRUELAYER_REDIRECT_URI'),
          },
        });

        // Validate request timing
        const elapsedTime = Date.now() - (timestamp || 0);
        console.log('⏱️ Timing validation:', {
          requestTimestamp: timestamp,
          currentTime: Date.now(),
          elapsedMs: elapsedTime,
          isExpired: elapsedTime > 5 * 60 * 1000,
        });

        // Validate credentials match
        const credentialsValid = {
          client_id_match: client_id === Deno.env.get('TRUELAYER_CLIENT_ID'),
          redirect_uri_match: redirect_uri === Deno.env.get('TRUELAYER_REDIRECT_URI'),
          has_all_env_vars: !!(
            Deno.env.get('TRUELAYER_CLIENT_ID') && Deno.env.get('TRUELAYER_CLIENT_SECRET')
          ),
          code_present: !!code,
        };

        console.log('🔑 Credentials validation:', credentialsValid);

        if (!credentialsValid.client_id_match || !credentialsValid.redirect_uri_match) {
          console.error('❌ Credential mismatch:', {
            provided: {
              client_id: client_id?.substring(0, 10) + '...',
              redirect_uri,
            },
            expected: {
              client_id: Deno.env.get('TRUELAYER_CLIENT_ID')?.substring(0, 10) + '...',
              redirect_uri: Deno.env.get('TRUELAYER_REDIRECT_URI'),
            },
          });
          return new Response(
            JSON.stringify({
              error: 'invalid_request',
              details: 'Credentials do not match',
              validation: credentialsValid,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }

        // Prepare token exchange request
        const tokenUrl = 'https://auth.truelayer-sandbox.com/connect/token';
        const requestBody = {
          grant_type: 'authorization_code',
          client_id: Deno.env.get('TRUELAYER_CLIENT_ID'),
          client_secret: Deno.env.get('TRUELAYER_CLIENT_SECRET'),
          code,
          redirect_uri: Deno.env.get('TRUELAYER_REDIRECT_URI'),
        };

        // Log the exact request being sent
        console.log('📤 TrueLayer request:', {
          url: tokenUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
            'X-Debug': 'true',
            'X-TL-Environment': 'sandbox',
          },
          body: {
            ...requestBody,
            client_secret: '[REDACTED]',
            code: code.substring(0, 10) + '...',
          },
        });

        // Make the request with additional headers
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

        // Get raw response
        const responseText = await response.text();
        console.log('📥 Raw Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
        });

        // Parse response
        let data;
        try {
          data = JSON.parse(responseText);

          if (!response.ok) {
            // Enhanced error logging
            console.error('❌ Token exchange failed:', {
              status: response.status,
              error: data.error,
              error_description: data.error_description,
              request: {
                client_id_match: requestBody.client_id === client_id,
                redirect_uri_match: requestBody.redirect_uri === redirect_uri,
                code_length: code.length,
                grant_type: requestBody.grant_type,
              },
            });

            // Return TrueLayer's error details
            return new Response(
              JSON.stringify({
                error: data.error,
                error_description: data.error_description,
                details: `TrueLayer error: ${data.error} - ${data.error_description || 'No description provided'}`,
                request_details: {
                  client_id_match: requestBody.client_id === client_id,
                  redirect_uri_match: requestBody.redirect_uri === redirect_uri,
                },
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.status,
              }
            );
          }
        } catch (error) {
          console.error('❌ Failed to parse response:', error);
          throw new Error(`Invalid response format: ${responseText}`);
        }

        // Log parsed response (safely)
        console.log('�� Parsed Response:', {
          success: response.ok,
          status: response.status,
          error: data.error,
          error_description: data.error_description,
          has_access_token: !!data.access_token,
          has_refresh_token: !!data.refresh_token,
        });

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (error) {
        console.error('💥 Exchange error:', {
          message: error.message,
          stack: error.stack,
        });
        return new Response(
          JSON.stringify({
            error: 'Failed to exchange code',
            details: error.message,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
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
