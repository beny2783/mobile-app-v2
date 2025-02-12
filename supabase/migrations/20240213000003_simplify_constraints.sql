-- Drop all existing constraints
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_user_id_connection_id_account_id_key;
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_user_id_connection_id_account_id_unique;
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS "bank_accounts_user_id_connection_id_account_id_key";
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_unique_account;

ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_user_id_connection_id_account_id_key;
ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_user_id_connection_id_account_id_unique;
ALTER TABLE balances DROP CONSTRAINT IF EXISTS "balances_user_id_connection_id_account_id_key";
ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_unique_account;

-- Add simple constraints
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_unique_account 
    UNIQUE (user_id, connection_id, account_id);

ALTER TABLE balances ADD CONSTRAINT balances_unique_account 
    UNIQUE (user_id, connection_id, account_id);

-- Verify constraints exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'bank_accounts_unique_account'
    ) THEN
        RAISE EXCEPTION 'bank_accounts constraint not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'balances_unique_account'
    ) THEN
        RAISE EXCEPTION 'balances constraint not created';
    END IF;

    RAISE NOTICE 'Constraints created successfully';
END $$; 