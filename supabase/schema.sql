

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."target_period" AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'yearly'
);


ALTER TYPE "public"."target_period" OWNER TO "postgres";


CREATE TYPE "public"."target_type" AS ENUM (
    'spending',
    'saving'
);


ALTER TYPE "public"."target_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."begin_transaction"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Start a new transaction block
    -- Note: In PostgreSQL, transactions are implicit within functions
    -- so we don't need an explicit BEGIN
    NULL;
END;
$$;


ALTER FUNCTION "public"."begin_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_award_achievement"("p_user_id" "uuid", "p_badge_name" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_already_earned boolean;
BEGIN
    -- Check if user already has this achievement
    SELECT EXISTS (
        SELECT 1 
        FROM user_achievements 
        WHERE user_id = p_user_id AND badge_name = p_badge_name
    ) INTO v_already_earned;
    
    -- If not earned, award it
    IF NOT v_already_earned THEN
        INSERT INTO user_achievements (user_id, badge_name, metadata)
        VALUES (p_user_id, p_badge_name, p_metadata);
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;


ALTER FUNCTION "public"."check_and_award_achievement"("p_user_id" "uuid", "p_badge_name" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commit_transaction"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Commit the current transaction
    COMMIT;
END;
$$;


ALTER FUNCTION "public"."commit_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."disconnect_bank"("p_connection_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- First verify the connection exists and belongs to the user
  if not exists (
    select 1
    from bank_connections
    where id = p_connection_id
    and user_id = p_user_id
  ) then
    raise exception 'Bank connection not found or unauthorized';
  end if;

  -- Update connection status
  update bank_connections
  set status = 'disconnected',
      disconnected_at = now(),
      encrypted_access_token = null,  -- Clear tokens
      encrypted_refresh_token = null
  where id = p_connection_id
  and user_id = p_user_id;

  -- Delete associated transactions for this specific connection
  delete from transactions
  where user_id = p_user_id
  and connection_id = p_connection_id;

  -- Delete associated balances for this specific connection
  delete from balances
  where user_id = p_user_id
  and connection_id = p_connection_id;

  -- Delete associated bank accounts for this specific connection
  delete from bank_accounts
  where user_id = p_user_id
  and connection_id = p_connection_id;

  -- Commit the transaction
  commit;
end;
$$;


ALTER FUNCTION "public"."disconnect_bank"("p_connection_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."disconnect_bank"("p_connection_id" "uuid", "p_user_id" "uuid") IS 'Safely disconnects a bank connection and removes all associated data for that specific connection.';



CREATE OR REPLACE FUNCTION "public"."get_active_bank_connections"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "provider" "text", "status" "text", "created_at" timestamp with time zone, "bank_name" "text", "logo_url" "text", "last_sync_status" "text", "last_sync" timestamp with time zone, "bank_accounts" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    WITH account_counts AS (
        SELECT 
            connection_id,
            jsonb_build_array(
                jsonb_build_object(
                    'count', COUNT(*)
                )
            ) as counts
        FROM bank_accounts
        WHERE user_id = p_user_id
        GROUP BY connection_id
    )
    SELECT 
        bc.id,
        bc.provider,
        bc.status,
        bc.created_at,
        COALESCE(bc.bank_name, 'Connected Bank') as bank_name,
        bc.logo_url,
        CASE 
            WHEN bc.last_sync IS NULL THEN 'pending'
            WHEN bc.last_sync < NOW() - INTERVAL '24 hours' THEN 'needs_update'
            ELSE 'success'
        END as last_sync_status,
        bc.last_sync,
        COALESCE(ac.counts, '[]'::jsonb) as bank_accounts
    FROM bank_connections bc
    LEFT JOIN account_counts ac ON ac.connection_id = bc.id
    WHERE bc.user_id = p_user_id
    AND bc.status = 'active'
    AND bc.disconnected_at IS NULL
    AND bc.encrypted_access_token IS NOT NULL
    ORDER BY bc.created_at DESC;
$$;


ALTER FUNCTION "public"."get_active_bank_connections"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_bank_connections"("p_user_id" "uuid") IS 'Retrieves active bank connections for a user with metadata including account counts and sync status.';



CREATE OR REPLACE FUNCTION "public"."is_challenge_eligible"("p_user_id" "uuid", "p_challenge_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_challenge record;
    v_active_count integer;
BEGIN
    -- Get challenge details
    SELECT * FROM challenges WHERE id = p_challenge_id INTO v_challenge;
    
    -- Check if user already has an active instance of this challenge
    SELECT COUNT(*)
    FROM user_challenges
    WHERE user_id = p_user_id
    AND challenge_id = p_challenge_id
    AND status = 'active'
    INTO v_active_count;
    
    -- Daily challenges can only be active once per day
    IF v_challenge.type = 'daily' AND v_active_count > 0 THEN
        RETURN false;
    END IF;
    
    -- Weekly challenges can only be active once per week
    IF v_challenge.type = 'weekly' AND v_active_count > 0 THEN
        RETURN false;
    END IF;
    
    -- Achievement challenges can only be active once until completed
    IF v_challenge.type = 'achievement' THEN
        IF EXISTS (
            SELECT 1 FROM user_achievements
            WHERE user_id = p_user_id
            AND badge_name = v_challenge.reward_badge
        ) THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."is_challenge_eligible"("p_user_id" "uuid", "p_challenge_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_challenge_eligible"("p_user_id" "uuid", "p_challenge_id" "uuid") IS 'Checks if a user is eligible to start a specific challenge';



CREATE OR REPLACE FUNCTION "public"."rollback_transaction"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Rollback the current transaction
    ROLLBACK;
END;
$$;


ALTER FUNCTION "public"."rollback_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_category_target_amount"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    target_record RECORD;
    period_start_date TIMESTAMP WITH TIME ZONE;
    transaction_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Use the transaction's timestamp for calculations
    transaction_date := COALESCE(NEW.timestamp, CURRENT_TIMESTAMP);

    -- For inserts and updates
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Get the category target record
        SELECT * INTO target_record
        FROM category_targets
        WHERE user_id = NEW.user_id AND category = NEW.transaction_category;

        IF FOUND THEN
            -- Calculate period start based on target period and transaction date
            period_start_date := CASE target_record.period
                WHEN 'daily' THEN date_trunc('day', transaction_date)
                WHEN 'weekly' THEN date_trunc('week', transaction_date)
                WHEN 'monthly' THEN date_trunc('month', transaction_date)
                WHEN 'yearly' THEN date_trunc('year', transaction_date)
            END;

            -- Update period_start if it's a new period
            IF period_start_date > target_record.period_start THEN
                UPDATE category_targets
                SET period_start = period_start_date,
                    current_amount = 0
                WHERE id = target_record.id;
            END IF;

            -- Update the new category target amount using absolute values for expenses
            UPDATE category_targets
            SET current_amount = COALESCE(
                (
                    SELECT SUM(ABS(amount))
                    FROM transactions
                    WHERE user_id = NEW.user_id
                    AND transaction_category = NEW.transaction_category
                    AND timestamp >= period_start_date
                ),
                0
            )
            WHERE id = target_record.id;
        END IF;
    END IF;

    -- For updates where category changed, also update old category
    IF TG_OP = 'UPDATE' AND 
       (NEW.transaction_category != OLD.transaction_category OR NEW.amount != OLD.amount) THEN
        -- Get the old category target record
        SELECT * INTO target_record
        FROM category_targets
        WHERE user_id = OLD.user_id AND category = OLD.transaction_category;

        IF FOUND THEN
            -- Calculate period start based on target period and transaction date
            period_start_date := CASE target_record.period
                WHEN 'daily' THEN date_trunc('day', transaction_date)
                WHEN 'weekly' THEN date_trunc('week', transaction_date)
                WHEN 'monthly' THEN date_trunc('month', transaction_date)
                WHEN 'yearly' THEN date_trunc('year', transaction_date)
            END;

            -- Update the old category target amount
            UPDATE category_targets
            SET current_amount = COALESCE(
                (
                    SELECT SUM(ABS(amount))
                    FROM transactions
                    WHERE user_id = OLD.user_id
                    AND transaction_category = OLD.transaction_category
                    AND timestamp >= period_start_date
                ),
                0
            )
            WHERE id = target_record.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_category_target_amount"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_merchant_pattern"("p_merchant_pattern" "text", "p_category" "text", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Delete existing patterns
    DELETE FROM merchant_categories
    WHERE merchant_pattern = p_merchant_pattern
    AND user_id = p_user_id;

    -- Insert new pattern
    INSERT INTO merchant_categories (merchant_pattern, category, user_id)
    VALUES (p_merchant_pattern, p_category, p_user_id);
END;
$$;


ALTER FUNCTION "public"."update_merchant_pattern"("p_merchant_pattern" "text", "p_category" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_xp"("p_user_id" "uuid", "p_xp_earned" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO user_progress (user_id, total_xp, current_level)
    VALUES (p_user_id, p_xp_earned, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_xp = user_progress.total_xp + p_xp_earned,
        current_level = GREATEST(1, FLOOR(LN(user_progress.total_xp + p_xp_earned) / LN(1.5))::integer),
        updated_at = now();
END;
$$;


ALTER FUNCTION "public"."update_user_xp"("p_user_id" "uuid", "p_xp_earned" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."balances" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "connection_id" "uuid",
    "account_id" "text" NOT NULL,
    "current" numeric(12,2) NOT NULL,
    "available" numeric(12,2),
    "currency" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "account_id" character varying NOT NULL,
    "account_type" character varying NOT NULL,
    "account_name" character varying NOT NULL,
    "currency" character varying NOT NULL,
    "balance" numeric,
    "last_updated" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."bank_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" character varying NOT NULL,
    "encrypted_access_token" "text",
    "encrypted_refresh_token" "text",
    "expires_at" timestamp with time zone,
    "status" character varying DEFAULT 'active'::character varying,
    "disconnected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "bank_name" "text",
    "logo_url" "text",
    "last_sync" timestamp with time zone
);


ALTER TABLE "public"."bank_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category_targets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "target_limit" numeric NOT NULL,
    "current_amount" numeric DEFAULT 0 NOT NULL,
    "color" "text" NOT NULL,
    "period" "public"."target_period" DEFAULT 'monthly'::"public"."target_period" NOT NULL,
    "period_start" timestamp with time zone DEFAULT "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "category_targets_current_amount_check" CHECK (("current_amount" >= (0)::numeric)),
    CONSTRAINT "category_targets_target_limit_check" CHECK (("target_limit" >= (0)::numeric))
);


ALTER TABLE "public"."category_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "type" "text" NOT NULL,
    "criteria" "jsonb" NOT NULL,
    "reward_xp" integer NOT NULL,
    "reward_badge" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "challenges_type_check" CHECK (("type" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'achievement'::"text"])))
);


ALTER TABLE "public"."challenges" OWNER TO "postgres";


COMMENT ON TABLE "public"."challenges" IS 'Defines different types of challenges available in the app';



CREATE TABLE IF NOT EXISTS "public"."daily_spending" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "amount" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_spending" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "merchant_pattern" "text" NOT NULL,
    "category" "text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."merchant_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_features" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "feature_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."subscription_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price_monthly" numeric(10,2) NOT NULL,
    "price_yearly" numeric(10,2) NOT NULL,
    "features" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."target_achievements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "color" "text" NOT NULL,
    "achieved_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."target_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."targets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."target_type" NOT NULL,
    "amount" numeric NOT NULL,
    "current_amount" numeric DEFAULT 0 NOT NULL,
    "period" "public"."target_period" NOT NULL,
    "category" "text",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "targets_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "targets_current_amount_check" CHECK (("current_amount" >= (0)::numeric)),
    CONSTRAINT "valid_date_range" CHECK (("end_date" > "start_date"))
);


ALTER TABLE "public"."targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "transaction_id" "text" NOT NULL,
    "account_id" "text" DEFAULT 'default'::"text" NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "description" "text",
    "amount" numeric,
    "currency" "text",
    "transaction_type" "text",
    "transaction_category" "text" DEFAULT 'Uncategorized'::"text",
    "merchant_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "connection_id" "uuid"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."transactions"."connection_id" IS 'References the bank connection that this transaction belongs to';



CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "badge_name" "text" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_achievements" IS 'Stores user earned achievements and badges';



CREATE TABLE IF NOT EXISTS "public"."user_challenges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "challenge_id" "uuid",
    "status" "text" NOT NULL,
    "progress" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "streak_count" integer DEFAULT 0,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_challenges_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."user_challenges" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_challenges" IS 'Tracks user progress on various challenges';



CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "total_xp" integer DEFAULT 0,
    "current_level" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_progress" IS 'Tracks user XP and level progression';



CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "payment_provider" "text" NOT NULL,
    "payment_provider_subscription_id" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."balances"
    ADD CONSTRAINT "balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balances"
    ADD CONSTRAINT "balances_user_id_connection_id_account_id_key" UNIQUE ("user_id", "connection_id", "account_id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_account_id_connection_id_key" UNIQUE ("account_id", "connection_id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_user_id_connection_id_account_id_key" UNIQUE ("user_id", "connection_id", "account_id");



ALTER TABLE ONLY "public"."bank_connections"
    ADD CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_targets"
    ADD CONSTRAINT "category_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_spending"
    ADD CONSTRAINT "daily_spending_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_categories"
    ADD CONSTRAINT "merchant_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_features"
    ADD CONSTRAINT "subscription_features_feature_key_key" UNIQUE ("feature_key");



ALTER TABLE ONLY "public"."subscription_features"
    ADD CONSTRAINT "subscription_features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."target_achievements"
    ADD CONSTRAINT "target_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."targets"
    ADD CONSTRAINT "targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_transaction_id_key" UNIQUE ("user_id", "transaction_id");



ALTER TABLE ONLY "public"."category_targets"
    ADD CONSTRAINT "unique_user_category" UNIQUE ("user_id", "category");



ALTER TABLE ONLY "public"."daily_spending"
    ADD CONSTRAINT "unique_user_date" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_unique" UNIQUE ("user_id", "badge_name");



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_unique" UNIQUE ("user_id", "challenge_id", "started_at");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



CREATE INDEX "balances_account_id_idx" ON "public"."balances" USING "btree" ("account_id");



CREATE INDEX "balances_connection_id_idx" ON "public"."balances" USING "btree" ("connection_id");



CREATE INDEX "balances_user_id_idx" ON "public"."balances" USING "btree" ("user_id");



CREATE INDEX "bank_accounts_connection_id_idx" ON "public"."bank_accounts" USING "btree" ("connection_id");



CREATE INDEX "bank_accounts_user_id_idx" ON "public"."bank_accounts" USING "btree" ("user_id");



CREATE INDEX "challenges_type_idx" ON "public"."challenges" USING "btree" ("type") WHERE ("active" = true);



CREATE INDEX "idx_category_targets_user_id" ON "public"."category_targets" USING "btree" ("user_id");



CREATE INDEX "idx_daily_spending_user_id_date" ON "public"."daily_spending" USING "btree" ("user_id", "date");



CREATE INDEX "idx_subscription_features_feature_key" ON "public"."subscription_features" USING "btree" ("feature_key");



CREATE INDEX "idx_target_achievements_target_id" ON "public"."target_achievements" USING "btree" ("target_id");



CREATE INDEX "idx_target_achievements_user_id" ON "public"."target_achievements" USING "btree" ("user_id");



CREATE INDEX "idx_targets_type_period" ON "public"."targets" USING "btree" ("type", "period");



CREATE INDEX "idx_targets_user_id" ON "public"."targets" USING "btree" ("user_id");



CREATE INDEX "idx_user_subscriptions_plan_id" ON "public"."user_subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_user_subscriptions_user_id" ON "public"."user_subscriptions" USING "btree" ("user_id");



CREATE INDEX "transactions_account_id_idx" ON "public"."transactions" USING "btree" ("account_id");



CREATE INDEX "transactions_connection_id_idx" ON "public"."transactions" USING "btree" ("connection_id");



CREATE INDEX "transactions_user_id_idx" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "user_achievements_user_idx" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "user_challenges_challenge_id_idx" ON "public"."user_challenges" USING "btree" ("challenge_id");



CREATE INDEX "user_challenges_started_at_idx" ON "public"."user_challenges" USING "btree" ("started_at");



CREATE INDEX "user_challenges_user_status_idx" ON "public"."user_challenges" USING "btree" ("user_id", "status");



CREATE INDEX "user_progress_level_idx" ON "public"."user_progress" USING "btree" ("current_level");



CREATE OR REPLACE TRIGGER "update_category_target_amount_trigger" AFTER INSERT OR UPDATE OF "transaction_category", "amount" ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_category_target_amount"();



CREATE OR REPLACE TRIGGER "update_daily_spending_updated_at" BEFORE UPDATE ON "public"."daily_spending" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_targets_updated_at" BEFORE UPDATE ON "public"."targets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."balances"
    ADD CONSTRAINT "balances_account_id_fkey" FOREIGN KEY ("account_id", "connection_id") REFERENCES "public"."bank_accounts"("account_id", "connection_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."balances"
    ADD CONSTRAINT "balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bank_connections"
    ADD CONSTRAINT "bank_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."category_targets"
    ADD CONSTRAINT "category_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."daily_spending"
    ADD CONSTRAINT "daily_spending_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."merchant_categories"
    ADD CONSTRAINT "merchant_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."target_achievements"
    ADD CONSTRAINT "target_achievements_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id");



ALTER TABLE ONLY "public"."target_achievements"
    ADD CONSTRAINT "target_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."targets"
    ADD CONSTRAINT "targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Anyone can read merchant categories" ON "public"."merchant_categories" FOR SELECT USING (true);



CREATE POLICY "Challenges are viewable by all authenticated users" ON "public"."challenges" FOR SELECT TO "authenticated" USING (("active" = true));



CREATE POLICY "System can insert user achievements" ON "public"."user_achievements" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "System can update user progress" ON "public"."user_progress" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own category targets" ON "public"."category_targets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own targets" ON "public"."targets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own achievements" ON "public"."target_achievements" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own balances" ON "public"."balances" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own bank accounts" ON "public"."bank_accounts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own bank connections" ON "public"."bank_connections" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own categories" ON "public"."merchant_categories" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can insert their own category targets" ON "public"."category_targets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own challenge progress" ON "public"."user_challenges" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own daily spending" ON "public"."daily_spending" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own targets" ON "public"."targets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own transactions" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own balances" ON "public"."balances" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own bank accounts" ON "public"."bank_accounts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own bank connections" ON "public"."bank_connections" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own category targets" ON "public"."category_targets" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own challenge progress" ON "public"."user_challenges" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own daily spending" ON "public"."daily_spending" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own targets" ON "public"."targets" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own transactions" ON "public"."transactions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own achievements" ON "public"."target_achievements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own achievements" ON "public"."user_achievements" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own balances" ON "public"."balances" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own bank accounts" ON "public"."bank_accounts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own bank connections" ON "public"."bank_connections" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own category targets" ON "public"."category_targets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own challenge progress" ON "public"."user_challenges" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own daily spending" ON "public"."daily_spending" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own progress" ON "public"."user_progress" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own targets" ON "public"."targets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category_targets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_spending" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."merchant_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."target_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."targets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































GRANT ALL ON FUNCTION "public"."begin_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."begin_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."begin_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_award_achievement"("p_user_id" "uuid", "p_badge_name" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_award_achievement"("p_user_id" "uuid", "p_badge_name" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_award_achievement"("p_user_id" "uuid", "p_badge_name" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."commit_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."commit_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."commit_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."disconnect_bank"("p_connection_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."disconnect_bank"("p_connection_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."disconnect_bank"("p_connection_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_bank_connections"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_bank_connections"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_bank_connections"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_challenge_eligible"("p_user_id" "uuid", "p_challenge_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_challenge_eligible"("p_user_id" "uuid", "p_challenge_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_challenge_eligible"("p_user_id" "uuid", "p_challenge_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rollback_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."rollback_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rollback_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_category_target_amount"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_category_target_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_category_target_amount"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_merchant_pattern"("p_merchant_pattern" "text", "p_category" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_merchant_pattern"("p_merchant_pattern" "text", "p_category" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_merchant_pattern"("p_merchant_pattern" "text", "p_category" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_xp"("p_user_id" "uuid", "p_xp_earned" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_xp"("p_user_id" "uuid", "p_xp_earned" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_xp"("p_user_id" "uuid", "p_xp_earned" integer) TO "service_role";


















GRANT ALL ON TABLE "public"."balances" TO "anon";
GRANT ALL ON TABLE "public"."balances" TO "authenticated";
GRANT ALL ON TABLE "public"."balances" TO "service_role";



GRANT ALL ON TABLE "public"."bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."bank_connections" TO "anon";
GRANT ALL ON TABLE "public"."bank_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_connections" TO "service_role";



GRANT ALL ON TABLE "public"."category_targets" TO "anon";
GRANT ALL ON TABLE "public"."category_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."category_targets" TO "service_role";



GRANT ALL ON TABLE "public"."challenges" TO "anon";
GRANT ALL ON TABLE "public"."challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."challenges" TO "service_role";



GRANT ALL ON TABLE "public"."daily_spending" TO "anon";
GRANT ALL ON TABLE "public"."daily_spending" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_spending" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_categories" TO "anon";
GRANT ALL ON TABLE "public"."merchant_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_categories" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_features" TO "anon";
GRANT ALL ON TABLE "public"."subscription_features" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_features" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."target_achievements" TO "anon";
GRANT ALL ON TABLE "public"."target_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."target_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."targets" TO "anon";
GRANT ALL ON TABLE "public"."targets" TO "authenticated";
GRANT ALL ON TABLE "public"."targets" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_challenges" TO "anon";
GRANT ALL ON TABLE "public"."user_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
