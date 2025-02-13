import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { access_token } = await req.json();

    if (!access_token) {
      return new Response(JSON.stringify({ error: 'Access token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch accounts first
    const accountsResponse = await fetch('https://api.truelayer-sandbox.com/data/v1/accounts', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
      },
    });

    if (!accountsResponse.ok) {
      console.error('Failed to fetch accounts:', {
        status: accountsResponse.status,
        statusText: accountsResponse.statusText,
      });
      throw new Error(`Failed to fetch accounts: ${accountsResponse.statusText}`);
    }

    const accountsData = await accountsResponse.json();

    // Then fetch balances for each account
    const balancePromises = accountsData.results.map(async (account: any) => {
      const balanceResponse = await fetch(
        `https://api.truelayer-sandbox.com/data/v1/accounts/${account.account_id}/balance`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!balanceResponse.ok) {
        console.error(`Failed to fetch balance for account ${account.account_id}:`, {
          status: balanceResponse.status,
          statusText: balanceResponse.statusText,
        });
        throw new Error(`Failed to fetch balance for account ${account.account_id}`);
      }

      const balanceData = await balanceResponse.json();

      if (!balanceData.results || !balanceData.results[0]) {
        console.error(`No balance data for account ${account.account_id}`);
        return null;
      }

      const balance = balanceData.results[0];

      // Ensure numeric values
      const current =
        typeof balance.current === 'string' ? parseFloat(balance.current) : balance.current;
      const available =
        typeof balance.available === 'string' ? parseFloat(balance.available) : balance.available;

      if (isNaN(current) || isNaN(available)) {
        console.error(`Invalid balance values for account ${account.account_id}`);
      }

      return {
        ...balance,
        current: isNaN(current) ? 0 : current,
        available: isNaN(available) ? 0 : available,
      };
    });

    const balances = (await Promise.all(balancePromises)).filter((b) => b !== null);

    return new Response(JSON.stringify({ accounts: accountsData, balances }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-balances function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
