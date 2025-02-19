-- Drop and recreate category_targets table
DROP TABLE IF EXISTS category_targets CASCADE;

CREATE TABLE category_targets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category TEXT NOT NULL,
    target_limit DECIMAL NOT NULL CHECK (target_limit >= 0),
    current_amount DECIMAL NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    color TEXT NOT NULL,
    period target_period NOT NULL DEFAULT 'monthly',
    period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_user_category UNIQUE(user_id, category)
);

-- Create indexes
CREATE INDEX idx_category_targets_user_id ON category_targets(user_id);

-- Enable RLS
ALTER TABLE category_targets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own category targets"
    ON category_targets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category targets"
    ON category_targets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category targets"
    ON category_targets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category targets"
    ON category_targets FOR DELETE
    USING (auth.uid() = user_id);

-- Update the trigger function
CREATE OR REPLACE FUNCTION update_category_target_amount()
RETURNS TRIGGER AS $$
DECLARE
    target_record RECORD;
    period_start_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- For inserts and updates
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.transaction_category != OLD.transaction_category) THEN
        -- Get the category target record
        SELECT * INTO target_record
        FROM category_targets
        WHERE user_id = NEW.user_id AND category = NEW.transaction_category;

        IF FOUND THEN
            -- Calculate period start based on target period
            period_start_date := CASE target_record.period
                WHEN 'daily' THEN date_trunc('day', CURRENT_DATE)
                WHEN 'weekly' THEN date_trunc('week', CURRENT_DATE)
                WHEN 'monthly' THEN date_trunc('month', CURRENT_DATE)
                WHEN 'yearly' THEN date_trunc('year', CURRENT_DATE)
            END;

            -- Update period_start if it's a new period
            IF period_start_date > target_record.period_start THEN
                UPDATE category_targets
                SET period_start = period_start_date,
                    current_amount = 0
                WHERE id = target_record.id;
            END IF;

            -- Update the new category target amount
            UPDATE category_targets
            SET current_amount = COALESCE(
                (
                    SELECT SUM(amount)
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
    IF TG_OP = 'UPDATE' AND NEW.transaction_category != OLD.transaction_category THEN
        -- Get the old category target record
        SELECT * INTO target_record
        FROM category_targets
        WHERE user_id = OLD.user_id AND category = OLD.transaction_category;

        IF FOUND THEN
            -- Calculate period start based on target period
            period_start_date := CASE target_record.period
                WHEN 'daily' THEN date_trunc('day', CURRENT_DATE)
                WHEN 'weekly' THEN date_trunc('week', CURRENT_DATE)
                WHEN 'monthly' THEN date_trunc('month', CURRENT_DATE)
                WHEN 'yearly' THEN date_trunc('year', CURRENT_DATE)
            END;

            -- Update the old category target amount
            UPDATE category_targets
            SET current_amount = COALESCE(
                (
                    SELECT SUM(amount)
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

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS update_category_target_amount_trigger ON transactions;
CREATE TRIGGER update_category_target_amount_trigger
    AFTER INSERT OR UPDATE OF transaction_category
    ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_category_target_amount(); 