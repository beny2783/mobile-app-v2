-- Add unique constraint to bank_accounts table
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_user_id_connection_id_account_id_key;
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_user_id_connection_id_account_id_key UNIQUE (user_id, connection_id, account_id); 