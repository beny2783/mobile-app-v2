-- Create gamification schema tables

-- Challenges table to define different types of challenges
CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "name" text NOT NULL,
    "description" text NOT NULL,
    "type" text NOT NULL CHECK (type IN ('daily', 'weekly', 'achievement')),
    "criteria" jsonb NOT NULL,
    "reward_xp" integer NOT NULL,
    "reward_badge" text,
    "active" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT challenges_pkey PRIMARY KEY (id)
);

-- User challenge progress tracking
CREATE TABLE IF NOT EXISTS "public"."user_challenges" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "user_id" uuid REFERENCES auth.users(id),
    "challenge_id" uuid REFERENCES challenges(id),
    "status" text NOT NULL CHECK (status IN ('active', 'completed', 'failed')),
    "progress" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "streak_count" integer DEFAULT 0,
    "started_at" timestamptz DEFAULT now(),
    "completed_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT user_challenges_pkey PRIMARY KEY (id),
    CONSTRAINT user_challenges_unique UNIQUE (user_id, challenge_id, started_at)
);

-- User achievements tracking
CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "user_id" uuid REFERENCES auth.users(id),
    "badge_name" text NOT NULL,
    "earned_at" timestamptz DEFAULT now(),
    "metadata" jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
    CONSTRAINT user_achievements_unique UNIQUE (user_id, badge_name)
);

-- User XP and level tracking
CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "user_id" uuid REFERENCES auth.users(id),
    "total_xp" integer DEFAULT 0,
    "current_level" integer DEFAULT 1,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    CONSTRAINT user_progress_pkey PRIMARY KEY (id),
    CONSTRAINT user_progress_unique UNIQUE (user_id)
);

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS challenges_type_idx ON challenges(type) WHERE active = true;
CREATE INDEX IF NOT EXISTS user_challenges_user_status_idx ON user_challenges(user_id, status);
CREATE INDEX IF NOT EXISTS user_challenges_started_at_idx ON user_challenges(started_at);
CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_progress_level_idx ON user_progress(current_level);

-- Enable Row Level Security
ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Challenges are viewable by all authenticated users"
    ON "public"."challenges"
    FOR SELECT
    TO authenticated
    USING (active = true);

CREATE POLICY "Users can view their own challenge progress"
    ON "public"."user_challenges"
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress"
    ON "public"."user_challenges"
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge progress"
    ON "public"."user_challenges"
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own achievements"
    ON "public"."user_achievements"
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements"
    ON "public"."user_achievements"
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own progress"
    ON "public"."user_progress"
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "System can update user progress"
    ON "public"."user_progress"
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to update user XP
CREATE OR REPLACE FUNCTION update_user_xp(
    p_user_id uuid,
    p_xp_earned integer
) RETURNS void AS $$
BEGIN
    INSERT INTO user_progress (user_id, total_xp, current_level)
    VALUES (p_user_id, p_xp_earned, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_xp = user_progress.total_xp + p_xp_earned,
        current_level = GREATEST(1, FLOOR(LN(user_progress.total_xp + p_xp_earned) / LN(1.5))::integer),
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievement(
    p_user_id uuid,
    p_badge_name text,
    p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS boolean AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE challenges IS 'Defines different types of challenges available in the app';
COMMENT ON TABLE user_challenges IS 'Tracks user progress on various challenges';
COMMENT ON TABLE user_achievements IS 'Stores user earned achievements and badges';
COMMENT ON TABLE user_progress IS 'Tracks user XP and level progression'; 