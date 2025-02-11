-- Drop and recreate categories with new patterns
truncate table merchant_categories;

-- Add comprehensive default categories
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

-- Add at the end of the file
alter table transactions alter column account_id set default 'default';