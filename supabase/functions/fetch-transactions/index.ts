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
      const { access_token, from_date, to_date } = await req.json();

      if (!access_token) {
        return new Response(JSON.stringify({ error: 'Access token is required' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Get accounts first
      const accountsResponse = await fetch('https://api.truelayer-sandbox.com/data/v1/accounts', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const accountsData = await accountsResponse.json();

      if (!accountsResponse.ok) {
        return new Response(JSON.stringify(accountsData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: accountsResponse.status,
        });
      }

      // Get transactions for each account
      const transactions = [];
      for (const account of accountsData.results) {
        const transactionsResponse = await fetch(
          `https://api.truelayer-sandbox.com/data/v1/accounts/${account.account_id}/transactions`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );

        const transactionsData = await transactionsResponse.json();
        if (transactionsResponse.ok) {
          // Add account_id to each transaction
          const accountTransactions = transactionsData.results.map((t) => ({
            ...t,
            account_id: account.account_id,
          }));
          transactions.push(...accountTransactions);
        }
      }

      return new Response(JSON.stringify({ transactions }), {
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
