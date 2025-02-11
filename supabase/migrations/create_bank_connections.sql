create table bank_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  provider varchar not null,
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table bank_connections enable row level security;

-- Policies
create policy "Users can view own bank connections"
  on bank_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert own bank connections"
  on bank_connections for insert
  with check (auth.uid() = user_id); 