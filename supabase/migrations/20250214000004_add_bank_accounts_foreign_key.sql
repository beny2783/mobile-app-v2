-- Add foreign key relationship between bank_accounts and bank_connections
ALTER TABLE "public"."bank_accounts"
    DROP CONSTRAINT IF EXISTS "bank_accounts_connection_id_fkey",
    ADD CONSTRAINT "bank_accounts_connection_id_fkey"
    FOREIGN KEY (connection_id)
    REFERENCES "public"."bank_connections"(id)
    ON DELETE CASCADE;

-- Add foreign key relationship between balances and bank_accounts
ALTER TABLE "public"."balances"
    DROP CONSTRAINT IF EXISTS "balances_account_id_fkey",
    ADD CONSTRAINT "balances_account_id_fkey"
    FOREIGN KEY (account_id, connection_id)
    REFERENCES "public"."bank_accounts"(account_id, connection_id)
    ON DELETE CASCADE;

-- Verify the constraints were added
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.conname = 'bank_accounts_connection_id_fkey'
        AND n.nspname = 'public'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint bank_accounts_connection_id_fkey not created successfully';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.conname = 'balances_account_id_fkey'
        AND n.nspname = 'public'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint balances_account_id_fkey not created successfully';
    END IF;
END $$; 