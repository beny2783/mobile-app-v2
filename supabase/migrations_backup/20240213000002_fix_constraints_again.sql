-- Drop and recreate constraints with the exact names PostgREST expects
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_user_id_connection_id_account_id_key;
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_user_id_connection_id_account_id_unique;
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS "bank_accounts_user_id_connection_id_account_id_key";
ALTER TABLE bank_accounts ADD CONSTRAINT "bank_accounts_user_id_connection_id_account_id_key" 
    UNIQUE (user_id, connection_id, account_id);

ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_user_id_connection_id_account_id_key;
ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_user_id_connection_id_account_id_unique;
ALTER TABLE balances DROP CONSTRAINT IF EXISTS "balances_user_id_connection_id_account_id_key";
ALTER TABLE balances ADD CONSTRAINT "balances_user_id_connection_id_account_id_key" 
    UNIQUE (user_id, connection_id, account_id);

-- Verify constraints exist and get their exact names
DO $$ 
DECLARE
    bank_constraint_name text;
    balance_constraint_name text;
BEGIN
    SELECT constraint_name INTO bank_constraint_name
    FROM information_schema.table_constraints 
    WHERE table_name = 'bank_accounts'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%user_id%connection_id%account_id%';

    SELECT constraint_name INTO balance_constraint_name
    FROM information_schema.table_constraints 
    WHERE table_name = 'balances'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%user_id%connection_id%account_id%';

    IF bank_constraint_name IS NULL THEN
        RAISE EXCEPTION 'bank_accounts unique constraint not found';
    END IF;

    IF balance_constraint_name IS NULL THEN
        RAISE EXCEPTION 'balances unique constraint not found';
    END IF;

    RAISE NOTICE 'Constraints verified: bank_accounts=%, balances=%', bank_constraint_name, balance_constraint_name;
END $$; 