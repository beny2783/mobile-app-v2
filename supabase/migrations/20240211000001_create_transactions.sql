create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  transaction_id text not null,
  account_id text not null,
  timestamp timestamptz not null,
  description text not null,
  amount decimal not null,
  currency text not null,
  transaction_type text,
  transaction_category text,
  merchant_name text,
  created_at timestamptz default now() not null,
  
  -- Ensure we don't duplicate transactions
  unique(user_id, transaction_id)
);

-- Add indexes for common queries
create index transactions_user_id_timestamp_idx on transactions(user_id, timestamp desc);
create index transactions_user_id_amount_idx on transactions(user_id, amount);

-- Add RLS policies
alter table transactions enable row level security;

create policy "Users can view their own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on transactions for insert
  with check (auth.uid() = user_id); 