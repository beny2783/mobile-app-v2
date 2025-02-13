-- Drop existing table if it exists
DROP TABLE IF EXISTS balances;

-- Create balances table
CREATE TABLE balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES bank_connections(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  current DECIMAL(12,2) NOT NULL,
  available DECIMAL(12,2),
  currency TEXT NOT NULL,
  account_name TEXT,
  account_type TEXT,
  provider_name TEXT,
  provider_logo_uri TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Add unique constraint to prevent duplicate balances for same account
  UNIQUE(user_id, connection_id, account_id)
);

-- Add RLS policies
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own balances" ON balances;
DROP POLICY IF EXISTS "Users can insert their own balances" ON balances;
DROP POLICY IF EXISTS "Users can update their own balances" ON balances;

-- Create new policies
CREATE POLICY "Users can view their own balances"
  ON balances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balances"
  ON balances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balances"
  ON balances
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX balances_user_id_idx ON balances(user_id);
CREATE INDEX balances_connection_id_idx ON balances(connection_id);
CREATE INDEX balances_account_id_idx ON balances(account_id);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp
CREATE TRIGGER update_balances_updated_at
  BEFORE UPDATE ON balances
  FOR EACH ROW
  EXECUTE FUNCTION update_balances_updated_at(); 