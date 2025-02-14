-- Add unique constraint on bank_accounts for account_id and connection_id
ALTER TABLE "public"."bank_accounts"
    DROP CONSTRAINT IF EXISTS "bank_accounts_account_id_connection_id_key",
    ADD CONSTRAINT "bank_accounts_account_id_connection_id_key"
    UNIQUE (account_id, connection_id);

-- Verify the constraint was added
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.conname = 'bank_accounts_account_id_connection_id_key'
        AND n.nspname = 'public'
    ) THEN
        RAISE EXCEPTION 'Unique constraint bank_accounts_account_id_connection_id_key not created successfully';
    END IF;
END $$; 