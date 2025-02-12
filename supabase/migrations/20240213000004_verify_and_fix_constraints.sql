-- First, drop any existing constraints to start fresh
ALTER TABLE bank_accounts 
    DROP CONSTRAINT IF EXISTS bank_accounts_unique_account,
    DROP CONSTRAINT IF EXISTS bank_accounts_user_id_connection_id_account_id_key,
    DROP CONSTRAINT IF EXISTS bank_accounts_user_id_connection_id_account_id_unique;

ALTER TABLE balances 
    DROP CONSTRAINT IF EXISTS balances_unique_account,
    DROP CONSTRAINT IF EXISTS balances_user_id_connection_id_account_id_key,
    DROP CONSTRAINT IF EXISTS balances_user_id_connection_id_account_id_unique;

-- Add constraints with explicit names that match what PostgREST expects
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_user_id_connection_id_account_id_key 
    UNIQUE (user_id, connection_id, account_id);

ALTER TABLE balances ADD CONSTRAINT balances_user_id_connection_id_account_id_key 
    UNIQUE (user_id, connection_id, account_id);

-- Verify the constraints exist and are properly named
DO $$ 
DECLARE
    bank_constraint_exists boolean;
    balance_constraint_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.conname = 'bank_accounts_user_id_connection_id_account_id_key'
        AND n.nspname = 'public'
    ) INTO bank_constraint_exists;

    SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.conname = 'balances_user_id_connection_id_account_id_key'
        AND n.nspname = 'public'
    ) INTO balance_constraint_exists;

    IF NOT bank_constraint_exists THEN
        RAISE EXCEPTION 'bank_accounts constraint not found or not properly named';
    END IF;

    IF NOT balance_constraint_exists THEN
        RAISE EXCEPTION 'balances constraint not found or not properly named';
    END IF;

    RAISE NOTICE 'All constraints verified successfully';
END $$; 