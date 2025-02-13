-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS "public"."balances" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "user_id" uuid REFERENCES auth.users(id),
    "connection_id" uuid,
    "account_id" text NOT NULL,
    "current" numeric(12,2) NOT NULL,
    "available" numeric(12,2),
    "currency" text NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT balances_pkey PRIMARY KEY (id),
    CONSTRAINT balances_user_id_connection_id_account_id_key UNIQUE (user_id, connection_id, account_id)
);

CREATE TABLE IF NOT EXISTS "public"."bank_accounts" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES auth.users(id),
    "connection_id" uuid NOT NULL,
    "account_id" varchar NOT NULL,
    "account_type" varchar NOT NULL,
    "account_name" varchar NOT NULL,
    "currency" varchar NOT NULL,
    "balance" numeric,
    "last_updated" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT bank_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT bank_accounts_user_id_connection_id_account_id_key UNIQUE (user_id, connection_id, account_id)
);

CREATE TABLE IF NOT EXISTS "public"."bank_connections" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES auth.users(id),
    "provider" varchar NOT NULL,
    "encrypted_access_token" text,
    "encrypted_refresh_token" text,
    "expires_at" timestamptz,
    "status" varchar DEFAULT 'active'::varchar,
    "disconnected_at" timestamptz,
    "created_at" timestamptz DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz DEFAULT timezone('utc'::text, now()),
    "bank_name" text,
    "logo_url" text,
    "last_sync" timestamptz,
    CONSTRAINT bank_connections_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."merchant_categories" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "merchant_pattern" text NOT NULL,
    "category" text NOT NULL,
    "user_id" uuid REFERENCES auth.users(id),
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT merchant_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" uuid NOT NULL REFERENCES auth.users(id),
    "created_at" timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES auth.users(id),
    "transaction_id" text NOT NULL,
    "account_id" text DEFAULT 'default'::text NOT NULL,
    "timestamp" timestamptz NOT NULL,
    "description" text,
    "amount" numeric,
    "currency" text,
    "transaction_type" text,
    "transaction_category" text DEFAULT 'Uncategorized'::text,
    "merchant_name" text,
    "created_at" timestamptz DEFAULT now(),
    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_user_id_transaction_id_key UNIQUE (user_id, transaction_id)
);

-- Enable Row Level Security
ALTER TABLE "public"."balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bank_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."merchant_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own balances" ON "public"."balances"
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balances" ON "public"."balances"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balances" ON "public"."balances"
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bank accounts" ON "public"."bank_accounts"
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON "public"."bank_accounts"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON "public"."bank_accounts"
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bank connections" ON "public"."bank_connections"
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank connections" ON "public"."bank_connections"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank connections" ON "public"."bank_connections"
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions" ON "public"."transactions"
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON "public"."transactions"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON "public"."transactions"
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS balances_user_id_idx ON balances(user_id);
CREATE INDEX IF NOT EXISTS balances_connection_id_idx ON balances(connection_id);
CREATE INDEX IF NOT EXISTS balances_account_id_idx ON balances(account_id);
CREATE INDEX IF NOT EXISTS bank_accounts_user_id_idx ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS bank_accounts_connection_id_idx ON bank_accounts(connection_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON transactions(account_id);
