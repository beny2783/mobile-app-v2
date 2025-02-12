-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  connection_id UUID REFERENCES bank_connections(id) NOT NULL,
  account_id VARCHAR NOT NULL,
  account_type VARCHAR NOT NULL,
  account_name VARCHAR NOT NULL,
  currency VARCHAR NOT NULL,
  balance NUMERIC,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Add unique constraint
  UNIQUE(user_id, connection_id, account_id)
);

-- Enable RLS on bank_accounts
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for bank_accounts
CREATE POLICY "Users can view their own bank accounts"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts"
  ON bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
  ON bank_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update balances table
ALTER TABLE balances
  -- Drop unnecessary columns
  DROP COLUMN IF EXISTS account_name,
  DROP COLUMN IF EXISTS account_type,
  DROP COLUMN IF EXISTS provider_name,
  DROP COLUMN IF EXISTS provider_logo_uri,
  DROP COLUMN IF EXISTS available_balance,
  DROP COLUMN IF EXISTS update_timestamp,
  -- Update column defaults
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN connection_id SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now()),
  ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now()),
  -- Add unique constraint for upsert operations
  DROP CONSTRAINT IF EXISTS balances_user_id_connection_id_account_id_key,
  ADD CONSTRAINT balances_user_id_connection_id_account_id_key UNIQUE (user_id, connection_id, account_id);

-- Update bank_connections table
ALTER TABLE bank_connections
  -- Update column defaults
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now()),
  ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now()),
  -- Make tokens nullable
  ALTER COLUMN encrypted_access_token DROP NOT NULL,
  -- Add last_sync column if it doesn't exist
  ADD COLUMN IF NOT EXISTS last_sync TIMESTAMPTZ; 