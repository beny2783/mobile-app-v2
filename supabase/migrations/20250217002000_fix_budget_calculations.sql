-- Update the trigger function to handle budget calculations correctly
CREATE OR REPLACE FUNCTION update_category_target_amount()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger to ensure it fires on amount changes too
DROP TRIGGER IF EXISTS update_category_target_amount_trigger ON transactions;
CREATE TRIGGER update_category_target_amount_trigger
    AFTER INSERT OR UPDATE OF transaction_category, amount
    ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_category_target_amount(); 