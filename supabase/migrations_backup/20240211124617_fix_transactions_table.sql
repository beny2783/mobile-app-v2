-- Create transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS transactions (
  user_id UUID REFERENCES auth.users(id),
  transaction_id TEXT,
  account_id TEXT,
  timestamp TIMESTAMPTZ,
  description TEXT,
  amount DECIMAL,
  currency TEXT,
  transaction_type TEXT,
  transaction_category TEXT DEFAULT 'Uncategorized',
  merchant_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, transaction_id)
);

-- Add RLS policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;

-- Create new policies
CREATE POLICY "Users can view their own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON transactions FOR UPDATE
USING (auth.uid() = user_id);