-- Function to begin a transaction
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Start a new transaction block
    -- Note: In PostgreSQL, transactions are implicit within functions
    -- so we don't need an explicit BEGIN
    NULL;
END;
$$;

-- Function to commit a transaction
CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Commit the current transaction
    COMMIT;
END;
$$;

-- Function to rollback a transaction
CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Rollback the current transaction
    ROLLBACK;
END;
$$;

-- Function to update merchant patterns atomically
CREATE OR REPLACE FUNCTION update_merchant_pattern(
    p_merchant_pattern text,
    p_category text,
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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