-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.disconnect_bank(uuid, uuid);

-- Create the new function
CREATE OR REPLACE FUNCTION public.disconnect_bank(p_connection_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_initial_counts jsonb;
    v_final_counts jsonb;
    v_connection_exists boolean;
BEGIN
    -- Check if connection exists and is active
    SELECT EXISTS (
        SELECT 1
        FROM bank_connections
        WHERE id = p_connection_id
        AND user_id = p_user_id
        AND status = 'active'
    ) INTO v_connection_exists;

    IF NOT v_connection_exists THEN
        RAISE EXCEPTION 'Bank connection not found or unauthorized';
    END IF;

    -- Get initial counts
    SELECT jsonb_build_object(
        'initial_counts', jsonb_build_object(
            'bank_accounts', (SELECT COUNT(*) FROM bank_accounts WHERE connection_id = p_connection_id),
            'balances', (SELECT COUNT(*) FROM balances WHERE connection_id = p_connection_id),
            'transactions', (SELECT COUNT(*) FROM transactions WHERE connection_id = p_connection_id)
        )
    ) INTO v_initial_counts;

    -- Delete associated records first
    DELETE FROM transactions WHERE connection_id = p_connection_id AND user_id = p_user_id;
    DELETE FROM balances WHERE connection_id = p_connection_id AND user_id = p_user_id;
    DELETE FROM bank_accounts WHERE connection_id = p_connection_id AND user_id = p_user_id;

    -- Update the connection status
    UPDATE bank_connections
    SET status = 'disconnected',
        disconnected_at = now(),
        encrypted_access_token = null,
        encrypted_refresh_token = null
    WHERE id = p_connection_id
    AND user_id = p_user_id
    AND status = 'active';

    -- Get final counts
    SELECT jsonb_build_object(
        'final_counts', jsonb_build_object(
            'bank_accounts', (SELECT COUNT(*) FROM bank_accounts WHERE connection_id = p_connection_id),
            'balances', (SELECT COUNT(*) FROM balances WHERE connection_id = p_connection_id),
            'transactions', (SELECT COUNT(*) FROM transactions WHERE connection_id = p_connection_id)
        )
    ) INTO v_final_counts;

    -- Return all information
    RETURN jsonb_build_object(
        'success', true,
        'connection_id', p_connection_id,
        'counts', v_initial_counts || v_final_counts
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.disconnect_bank(uuid, uuid) TO authenticated;

-- Add function documentation
COMMENT ON FUNCTION public.disconnect_bank(uuid, uuid) IS 'Safely disconnects a bank connection and removes all associated data for that specific connection.'; 