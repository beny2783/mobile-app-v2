-- Create enum types for target periods and types
CREATE TYPE target_period AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
CREATE TYPE target_type AS ENUM ('spending', 'saving');

-- Create targets table
CREATE TABLE targets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    type target_type NOT NULL,
    amount DECIMAL NOT NULL CHECK (amount >= 0),
    current_amount DECIMAL NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    period target_period NOT NULL,
    category TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Create category_targets table
CREATE TABLE category_targets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category TEXT NOT NULL,
    target_limit DECIMAL NOT NULL CHECK (target_limit >= 0),
    current_amount DECIMAL NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    color TEXT NOT NULL,
    min_limit DECIMAL NOT NULL CHECK (min_limit >= 0),
    max_limit DECIMAL NOT NULL CHECK (max_limit >= min_limit),
    period target_period NOT NULL DEFAULT 'monthly',
    period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_user_category UNIQUE(user_id, category)
);

-- Create target_achievements table
CREATE TABLE target_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    target_id UUID REFERENCES targets(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create daily_spending table
CREATE TABLE daily_spending (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_user_date UNIQUE(user_id, date)
);

-- Create indexes
CREATE INDEX idx_targets_user_id ON targets(user_id);
CREATE INDEX idx_targets_type_period ON targets(type, period);
CREATE INDEX idx_category_targets_user_id ON category_targets(user_id);
CREATE INDEX idx_target_achievements_user_id ON target_achievements(user_id);
CREATE INDEX idx_target_achievements_target_id ON target_achievements(target_id);
CREATE INDEX idx_daily_spending_user_id_date ON daily_spending(user_id, date);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_targets_updated_at
    BEFORE UPDATE ON targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_targets_updated_at
    BEFORE UPDATE ON category_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_spending_updated_at
    BEFORE UPDATE ON daily_spending
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_spending ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own targets"
    ON targets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own targets"
    ON targets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own targets"
    ON targets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own targets"
    ON targets FOR DELETE
    USING (auth.uid() = user_id);

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

CREATE POLICY "Users can view their own achievements"
    ON target_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
    ON target_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own daily spending"
    ON daily_spending FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily spending"
    ON daily_spending FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily spending"
    ON daily_spending FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to update category target amounts with period support
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
CREATE TRIGGER update_category_target_amount_trigger
    AFTER INSERT OR UPDATE OF transaction_category
    ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_category_target_amount();
