-- Insert initial challenges

-- Daily Challenges
INSERT INTO challenges (name, description, type, criteria, reward_xp, reward_badge) VALUES
(
    'No Spend Day',
    'Complete a full day without any non-essential spending',
    'daily',
    '{
        "type": "no_spend",
        "duration": "24h",
        "exclude_categories": ["Bills", "Rent", "Utilities"],
        "max_spend": 0
    }'::jsonb,
    50,
    'no_spend_master'
),
(
    'Pack Lunch Hero',
    'Save money by bringing your lunch instead of buying it',
    'daily',
    '{
        "type": "reduced_spending",
        "category": "Dining",
        "time_window": "11:00-15:00",
        "max_spend": 5.00
    }'::jsonb,
    30,
    'lunch_saver'
),
(
    'Weekend Warrior',
    'Reduce your weekend spending compared to your average',
    'weekly',
    '{
        "type": "spending_reduction",
        "days": ["Saturday", "Sunday"],
        "reduction_target": 0.30,
        "min_transactions": 1
    }'::jsonb,
    100,
    'weekend_warrior'
);

-- Achievement Challenges
INSERT INTO challenges (name, description, type, criteria, reward_xp, reward_badge) VALUES
(
    'First £100 Saved',
    'Save your first £100 through challenge completions',
    'achievement',
    '{
        "type": "savings",
        "target": 100.00,
        "currency": "GBP"
    }'::jsonb,
    200,
    'savings_starter'
),
(
    'Thirty Day Streak',
    'Stay under budget for 30 consecutive days',
    'achievement',
    '{
        "type": "streak",
        "days": 30,
        "condition": "under_budget"
    }'::jsonb,
    500,
    'streak_master'
),
(
    'Category Champion',
    'Stay under budget in all categories for a full month',
    'achievement',
    '{
        "type": "category_budget",
        "duration": "1 month",
        "all_categories": true
    }'::jsonb,
    300,
    'category_master'
),
(
    'Smart Shopper',
    'Save over £50 through smart shopping decisions',
    'achievement',
    '{
        "type": "smart_shopping",
        "target_savings": 50.00,
        "min_transactions": 5
    }'::jsonb,
    150,
    'smart_shopper'
);

-- Create helper function to check challenge eligibility
CREATE OR REPLACE FUNCTION is_challenge_eligible(
    p_user_id uuid,
    p_challenge_id uuid
) RETURNS boolean AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION is_challenge_eligible IS 'Checks if a user is eligible to start a specific challenge'; 