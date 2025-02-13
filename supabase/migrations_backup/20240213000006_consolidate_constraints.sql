-- Drop all existing constraints first
DO $$ 
BEGIN
    -- Drop bank_accounts constraints
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_accounts_user_id_connection_id_account_id_key') THEN
        ALTER TABLE bank_accounts DROP CONSTRAINT bank_accounts_user_id_connection_id_account_id_key;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bank_accounts_unique_account') THEN
        ALTER TABLE bank_accounts DROP CONSTRAINT bank_accounts_unique_account;
    END IF;

    -- Drop balances constraints
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'balances_user_id_connection_id_account_id_key') THEN
        ALTER TABLE balances DROP CONSTRAINT balances_user_id_connection_id_account_id_key;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'balances_unique_account') THEN
        ALTER TABLE balances DROP CONSTRAINT balances_unique_account;
    END IF;
END $$;

-- Add constraints with explicit names
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_user_id_connection_id_account_id_key 
    UNIQUE (user_id, connection_id, account_id);

ALTER TABLE balances ADD CONSTRAINT balances_user_id_connection_id_account_id_key 
    UNIQUE (user_id, connection_id, account_id);

-- Verify constraints exist and are properly named
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