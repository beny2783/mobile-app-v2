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

    console.log('🔄 Fetching accounts from TrueLayer...');
    // Fetch accounts first
    const accountsResponse = await fetch('https://api.truelayer-sandbox.com/data/v1/accounts', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
      },
    });

    if (!accountsResponse.ok) {
      console.error('❌ Failed to fetch accounts:', {
        status: accountsResponse.status,
        statusText: accountsResponse.statusText,
        body: await accountsResponse.text(),
      });
      throw new Error(`Failed to fetch accounts: ${accountsResponse.statusText}`);
    }

    const accountsData = await accountsResponse.json();
    console.log('✅ Accounts fetched:', {
      count: accountsData.results.length,
      accounts: accountsData.results.map((a: any) => ({
        account_id: a.account_id,
        account_type: a.account_type,
        display_name: a.display_name,
      })),
    });

    // Then fetch balances for each account
    console.log('🔄 Fetching balances for each account...');
    const balancePromises = accountsData.results.map(async (account: any) => {
      console.log(`Fetching balance for account ${account.account_id}...`);
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
        console.error(`❌ Failed to fetch balance for account ${account.account_id}:`, {
          status: balanceResponse.status,
          statusText: balanceResponse.statusText,
          body: await balanceResponse.text(),
        });
        throw new Error(`Failed to fetch balance for account ${account.account_id}`);
      }

      const balanceData = await balanceResponse.json();

      if (!balanceData.results || !balanceData.results[0]) {
        console.error(`❌ No balance data for account ${account.account_id}:`, balanceData);
        return null;
      }

      const balance = balanceData.results[0];
      console.log(`✅ Balance for account ${account.account_id}:`, {
        current: balance.current,
        available: balance.available,
        currency: balance.currency,
        raw: balance,
      });

      // Ensure numeric values
      const current =
        typeof balance.current === 'string' ? parseFloat(balance.current) : balance.current;
      const available =
        typeof balance.available === 'string' ? parseFloat(balance.available) : balance.available;

      if (isNaN(current) || isNaN(available)) {
        console.error(`❌ Invalid balance values for account ${account.account_id}:`, {
          raw_current: balance.current,
          raw_available: balance.available,
          parsed_current: current,
          parsed_available: available,
        });
      }

      return {
        ...balance,
        current: isNaN(current) ? 0 : current,
        available: isNaN(available) ? 0 : available,
      };
    });

    const balances = (await Promise.all(balancePromises)).filter((b) => b !== null);
    console.log(
      '✅ All balances fetched:',
      balances.map((b) => ({
        current: b.current,
        available: b.available,
        currency: b.currency,
      }))
    );

    return new Response(JSON.stringify({ accounts: accountsData, balances }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('💥 Error in fetch-balances function:', error);
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
