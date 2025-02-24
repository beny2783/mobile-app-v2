-- Function to calculate initial amount for a new category target
CREATE OR REPLACE FUNCTION calculate_initial_category_target_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- For new category targets, calculate the initial amount from all historical transactions
    IF TG_OP = 'INSERT' THEN
        -- Update the new target with the sum of all historical transactions
        UPDATE category_targets
        SET current_amount = COALESCE(
            (
                SELECT SUM(ABS(amount))
                FROM transactions
                WHERE user_id = NEW.user_id
                AND transaction_category = NEW.category
            ),
            0
        )
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to calculate initial amount on category target creation
DROP TRIGGER IF EXISTS calculate_initial_category_target_amount_trigger ON category_targets;
CREATE TRIGGER calculate_initial_category_target_amount_trigger
    AFTER INSERT
    ON category_targets
    FOR EACH ROW
    EXECUTE FUNCTION calculate_initial_category_target_amount();

-- Update existing category targets with correct amounts
UPDATE category_targets
SET current_amount = COALESCE(
    (
        SELECT SUM(ABS(amount))
        FROM transactions
        WHERE user_id = category_targets.user_id
        AND transaction_category = category_targets.category
    ),
    0
); 