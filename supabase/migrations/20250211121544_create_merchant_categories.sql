create table public.merchant_categories (
  id uuid default uuid_generate_v4() primary key,
  merchant_pattern text not null,
  category text not null,
  user_id uuid references auth.users(id),  -- null means system-wide rule
  created_at timestamptz default now() not null,
  
  -- Ensure unique patterns per user (or system-wide)
  unique(merchant_pattern, user_id)
);

-- First drop existing categories
delete from merchant_categories;

-- Add more comprehensive default categories
insert into merchant_categories (merchant_pattern, category, user_id) values
  -- Bills & Utilities
  ('DIRECT DEBIT', 'Bills', null),
  ('BILL PAYMENT', 'Bills', null),
  ('COUNCIL TAX', 'Bills', null),
  ('VODAFONE', 'Bills', null),
  ('EE', 'Bills', null),
  ('VIRGIN', 'Bills', null),
  ('BRITISH GAS', 'Bills', null),
  ('WATER', 'Bills', null),

  -- Transport
  ('UBER', 'Transport', null),
  ('TRAINLINE', 'Transport', null),
  ('TFL', 'Transport', null),
  ('SHELL', 'Transport', null),
  ('BP', 'Transport', null),
  ('ESSO', 'Transport', null),

  -- Shopping
  ('AMAZON', 'Shopping', null),
  ('PAYPAL', 'Shopping', null),
  ('EBAY', 'Shopping', null),
  ('ASOS', 'Shopping', null),

  -- Groceries
  ('TESCO', 'Groceries', null),
  ('SAINSBURY', 'Groceries', null),
  ('ASDA', 'Groceries', null),
  ('WAITROSE', 'Groceries', null),
  ('LIDL', 'Groceries', null),
  ('ALDI', 'Groceries', null),
  ('M&S', 'Groceries', null),

  -- Food & Drink
  ('DELIVEROO', 'Food & Drink', null),
  ('JUST EAT', 'Food & Drink', null),
  ('UBER EATS', 'Food & Drink', null),
  ('COSTA', 'Food & Drink', null),
  ('STARBUCKS', 'Food & Drink', null),
  ('PRET', 'Food & Drink', null),
  ('MCDONALDS', 'Food & Drink', null),

  -- Entertainment
  ('SPOTIFY', 'Entertainment', null),
  ('NETFLIX', 'Entertainment', null),
  ('APPLE.COM/BILL', 'Entertainment', null),
  ('DISNEY PLUS', 'Entertainment', null),
  ('PRIME VIDEO', 'Entertainment', null),
  ('CINEMA', 'Entertainment', null),

  -- Health & Fitness
  ('PHARMACY', 'Health', null),
  ('GYM', 'Health', null),
  ('FITNESS', 'Health', null),
  ('PURE GYM', 'Health', null);

-- Add RLS policies
alter table merchant_categories enable row level security;

create policy "Users can view system categories and their own"
  on merchant_categories for select
  using (user_id is null or auth.uid() = user_id);

create policy "Users can insert their own categories"
  on merchant_categories for insert
  with check (auth.uid() = user_id); 