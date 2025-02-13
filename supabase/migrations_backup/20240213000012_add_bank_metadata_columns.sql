-- Add bank metadata columns if they don't exist
ALTER TABLE bank_connections 
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update existing connections with default bank name
UPDATE bank_connections 
SET bank_name = CASE 
    WHEN provider = 'mock' THEN 'Mock Bank'
    ELSE 'Connected Bank'
END
WHERE bank_name IS NULL; 