-- Add foreign key relationship between bank_accounts and bank_connections
ALTER TABLE "public"."bank_accounts"
    DROP CONSTRAINT IF EXISTS "bank_accounts_connection_id_fkey",
    ADD CONSTRAINT "bank_accounts_connection_id_fkey"
    FOREIGN KEY (connection_id)
    REFERENCES "public"."bank_connections"(id)
    ON DELETE CASCADE;

-- Verify the constraint was added
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE c.conname = 'bank_accounts_connection_id_fkey'
        AND n.nspname = 'public'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint not created successfully';
    END IF;
END $$; 