-- Fix the foreign key relationship between user_challenges and challenges tables
DO $$ 
BEGIN
    -- First ensure the tables exist
    IF EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_challenges'
    ) THEN
        -- Only proceed with modifications if the table exists
        ALTER TABLE "public"."user_challenges"
            DROP CONSTRAINT IF EXISTS "user_challenges_challenge_id_fkey",
            ADD CONSTRAINT "user_challenges_challenge_id_fkey" 
            FOREIGN KEY (challenge_id) 
            REFERENCES "public"."challenges"(id)
            ON DELETE CASCADE;

        -- Add an index to improve join performance
        CREATE INDEX IF NOT EXISTS "user_challenges_challenge_id_idx" 
            ON "public"."user_challenges"(challenge_id);

        -- Verify the relationship exists
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_constraint 
            WHERE conname = 'user_challenges_challenge_id_fkey'
        ) THEN
            RAISE EXCEPTION 'Foreign key constraint was not created successfully';
        END IF;
    END IF;
END $$;