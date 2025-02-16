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
