-- Drop existing policies
drop policy if exists "Users can view their own transactions" on transactions;
drop policy if exists "Users can insert their own transactions" on transactions;

-- Create comprehensive policies
create policy "Users can manage their own transactions"
  on transactions
  for all -- This covers SELECT, INSERT, UPDATE, DELETE
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add policy for upserting transactions
create policy "Users can upsert their own transactions"
  on transactions
  for insert
  with check (auth.uid() = user_id); 