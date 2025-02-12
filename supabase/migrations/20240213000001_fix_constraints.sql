-- Drop existing constraints if they exist
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_user_id_connection_id_account_id_key;
ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_user_id_connection_id_account_id_key;

-- Add constraints back
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_user_id_connection_id_account_id_key 
    UNIQUE (user_id, connection_id, account_id);

ALTER TABLE balances ADD CONSTRAINT balances_user_id_connection_id_account_id_key 
    UNIQUE (user_id, connection_id, account_id);

-- Verify constraints exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'bank_accounts_user_id_connection_id_account_id_key'
    ) THEN
        RAISE EXCEPTION 'bank_accounts constraint not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'balances_user_id_connection_id_account_id_key'
    ) THEN
        RAISE EXCEPTION 'balances constraint not created';
    END IF;
END $$; 