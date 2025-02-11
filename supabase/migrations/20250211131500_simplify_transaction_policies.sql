-- Drop all existing policies
drop policy if exists "Users can view their own transactions" on transactions;
drop policy if exists "Users can insert their own transactions" on transactions;
drop policy if exists "Users can update their own transactions" on transactions;
drop policy if exists "Users can delete their own transactions" on transactions;
drop policy if exists "Users can manage their own transactions" on transactions;
drop policy if exists "transactions_policy" on transactions;

-- Enable RLS
alter table transactions enable row level security;

-- Create policies for each operation type
create policy "transactions_select"
  on transactions
  for select
  using (auth.uid() = user_id);

create policy "transactions_insert"
  on transactions
  for insert
  with check (auth.uid() = user_id);

create policy "transactions_update"
  on transactions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transactions_delete"
  on transactions
  for delete
  using (auth.uid() = user_id);