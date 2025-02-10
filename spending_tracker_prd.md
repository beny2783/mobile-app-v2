# Spending Tracker App - Technical Requirements

## Overview
The Spending Tracker App is a React Native mobile app that helps users track their spending by linking their Monzo, HSBC, and Amex accounts via TrueLayer. The app will fetch transactions, categorize spending, and store data in Supabase.

## Objectives
- Securely connect bank accounts (Monzo, HSBC, Amex)
- Fetch transactions automatically
- Categorize spending for better tracking
- Provide insights later (graphs in a future update)

## Target Audience
- People managing multiple bank accounts
- Users who want automatic spending logs
- Budget-conscious individuals

## Core Features & Implementation Order

### 1. Authentication (P0)
**User Story:** *As a user, I want to sign in with my Google account so my spending data is securely stored.*

**Technical Requirements:**
- Implement Supabase Auth with Google Sign-In
- Store user profile in Supabase
- Persist authentication state using SecureStore
- Handle sign-out flow

**Data Model:**
```sql
-- profiles table
create table profiles (
  id uuid references auth.users not null primary key,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Policies
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
```

### 2. Bank Connection (P0)
**User Story:** *As a user, I want to connect my bank accounts so I can track spending automatically.*

**Technical Requirements:**
- Implement TrueLayer OAuth flow
- Support connecting multiple banks (Monzo, HSBC, Amex)
- Securely store access tokens in Supabase
- Handle token refresh and expiry

**Data Model:**
```sql
-- bank_connections table
create table bank_connections (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id),
  provider varchar not null,
  access_token text,
  refresh_token text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- bank_accounts table
create table bank_accounts (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id),
  connection_id uuid not null references bank_connections(id),
  account_id varchar not null,
  account_type varchar not null,
  account_name varchar not null,
  currency varchar not null,
  balance numeric,
  last_updated timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table bank_connections enable row level security;
alter table bank_accounts enable row level security;

-- Policies for bank_connections
create policy "Users can read their own bank connections" 
  on bank_connections for select using (auth.uid() = user_id);

create policy "Users can insert their own bank connections" 
  on bank_connections for insert with check (auth.uid() = user_id);

create policy "Users can update their own bank connections" 
  on bank_connections for update using (auth.uid() = user_id);

-- Policies for bank_accounts
create policy "Users can read their own bank accounts" 
  on bank_accounts for select using (auth.uid() = user_id);

create policy "Users can insert their own bank accounts" 
  on bank_accounts for insert with check (auth.uid() = user_id);

create policy "Users can update their own bank accounts" 
  on bank_accounts for update using (auth.uid() = user_id);
```

### 3. Transaction Management (P0)
**User Story:** *As a user, I want to see my transactions categorized by type.*

**Technical Requirements:**
- Fetch transactions via TrueLayer API
- Store in Supabase with proper indexing
- Implement real-time updates using Supabase subscriptions
- Handle pagination for large transaction sets

**Data Model:**
```sql
-- transactions table
create table transactions (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id),
  account_id uuid not null references bank_accounts(id),
  transaction_id varchar not null,
  amount numeric not null,
  currency varchar not null,
  description text,
  merchant_name varchar,
  category varchar,
  transaction_date timestamptz not null,
  status varchar not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  
  -- Ensure unique transaction per account
  unique(account_id, transaction_id)
);

-- Enable RLS
alter table transactions enable row level security;

-- Policies
create policy "Users can read their own transactions"
  on transactions for select using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on transactions for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on transactions for update using (auth.uid() = user_id);

-- Indexes for common queries
create index idx_transactions_user_date 
  on transactions(user_id, transaction_date desc);

create index idx_transactions_account 
  on transactions(account_id, transaction_date desc);

create index idx_transactions_category 
  on transactions(user_id, category);

create index idx_transactions_search 
  on transactions using gin(to_tsvector('english', description || ' ' || merchant_name));
```

### 4. Transaction Filtering (P1)
**User Story:** *As a user, I want to filter and search my transactions.*

**Technical Requirements:**
- Full-text search across description and merchant
- Date range filtering
- Category and account filtering
- Amount range filtering
- Multi-currency support

**Example Queries:**
```sql
-- Full text search
select * from transactions
where user_id = auth.uid()
  and to_tsvector('english', description || ' ' || merchant_name) @@ to_tsquery('english', 'coffee & shop');

-- Date and category filtering
select t.*, ba.account_name
from transactions t
join bank_accounts ba on t.account_id = ba.id
where t.user_id = auth.uid()
  and t.transaction_date between $1 and $2
  and t.category = $3
order by t.transaction_date desc
limit 50;

-- Amount range in specific currency
select *
from transactions
where user_id = auth.uid()
  and currency = 'GBP'
  and amount between -100 and -50
order by transaction_date desc;
```

### 5. Settings & Account Management (P1)
**User Story:** *As a user, I want to manage my connected accounts.*

**Technical Requirements:**
- View connected banks
- Disconnect individual banks
- Manage user profile
- Sign out functionality

## Technical Architecture

### Frontend (React Native)
- **State Management:** Zustand
- **Navigation:** React Navigation
- **UI Components:** Native Base
- **API Client:** @supabase/supabase-js
- **Date Handling:** date-fns

### Backend Services
- **Authentication:** Supabase Auth
- **Database:** Supabase (PostgreSQL)
- **Banking API:** TrueLayer
- **Analytics:** PostHog or Supabase Analytics
- **Real-time:** Supabase Realtime

### Testing Requirements
- Unit tests for all business logic
- Integration tests for API flows
- E2E tests for critical user journeys
- Mock TrueLayer API for testing
- Test Supabase interactions using test database

## Security Requirements
- Secure token storage using SecureStore
- Row Level Security (RLS) policies in Supabase
- API key protection
- Input validation
- Error handling
- Rate limiting
- Data encryption at rest (handled by Supabase)

## Error States to Handle
- Network failures
- Authentication errors
- API rate limits
- Token expiry
- Invalid data
- Offline mode
- Database connection issues

## Performance Requirements
- App load < 2s
- Transaction list smooth scroll
- Offline support using local SQLite
- Background refresh
- Memory management
- Efficient PostgreSQL queries

## Future Considerations (Not MVP)
🚀 Spending analytics using PostgreSQL aggregations
🚀 Budget tracking with notifications
🚀 Push notifications via Supabase Edge Functions
🚀 Export functionality using PostgreSQL CSV export

## Development Environment
- React Native Expo
- TypeScript
- ESLint + Prettier
- Husky pre-commit hooks
- GitHub Actions CI/CD
- Supabase CLI for local development 