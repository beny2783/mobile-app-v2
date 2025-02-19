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


CREATE OR REPLACE FUNCTION "public"."update_category_target_amount"()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Drop and recreate the trigger to ensure it fires on amount changes too
DROP TRIGGER IF EXISTS update_category_target_amount_trigger ON transactions;
CREATE TRIGGER update_category_target_amount_trigger
    AFTER INSERT OR UPDATE OF transaction_category, amount
    ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_category_target_amount();

-- Grant necessary permissions
GRANT ALL ON FUNCTION public.update_category_target_amount() TO anon;
GRANT ALL ON FUNCTION public.update_category_target_amount() TO authenticated;
GRANT ALL ON FUNCTION public.update_category_target_amount() TO service_role;


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
