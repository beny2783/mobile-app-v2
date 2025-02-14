-- Add connection_id column to transactions table
ALTER TABLE "public"."transactions"
    ADD COLUMN IF NOT EXISTS "connection_id" uuid REFERENCES "public"."bank_connections"(id) ON DELETE CASCADE;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS "transactions_connection_id_idx" ON "public"."transactions"(connection_id);

-- Update existing transactions to link with bank_connections
-- This will be done through the application layer when fetching new transactions

-- Add a comment explaining the column
COMMENT ON COLUMN "public"."transactions"."connection_id" IS 'References the bank connection that this transaction belongs to'; 