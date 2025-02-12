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
      const { access_token } = await req.json();

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

        // Log transaction structure
        console.log('📝 TrueLayer transaction:', {
          sample: transactionsData.results[0],
          keys: Object.keys(transactionsData.results[0]),
        });

        if (transactionsResponse.ok) {
          const accountTransactions = transactionsData.results.map((t: any) => ({
            transaction_id: t.transaction_id,
            account_id: account.account_id,
            timestamp: t.timestamp,
            description: t.description,
            amount: t.amount,
            currency: t.currency,
            transaction_type: t.transaction_type,
            transaction_category: t.transaction_category,
            meta: t.meta,
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
