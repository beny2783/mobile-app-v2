-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_active_bank_connections(uuid);

-- Create the function
CREATE OR REPLACE FUNCTION public.get_active_bank_connections(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    provider text,
    status text,
    created_at timestamptz,
    bank_name text,
    logo_url text,
    last_sync_status text,
    last_sync timestamptz,
    bank_accounts jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH account_counts AS (
        SELECT 
            connection_id,
            jsonb_build_array(
                jsonb_build_object(
                    'count', COUNT(*)
                )
            ) as counts
        FROM bank_accounts
        WHERE user_id = p_user_id
        GROUP BY connection_id
    )
    SELECT 
        bc.id,
        bc.provider,
        bc.status,
        bc.created_at,
        COALESCE(bc.bank_name, 'Connected Bank') as bank_name,
        bc.logo_url,
        CASE 
            WHEN bc.last_sync IS NULL THEN 'pending'
            WHEN bc.last_sync < NOW() - INTERVAL '24 hours' THEN 'needs_update'
            ELSE 'success'
        END as last_sync_status,
        bc.last_sync,
        COALESCE(ac.counts, '[]'::jsonb) as bank_accounts
    FROM bank_connections bc
    LEFT JOIN account_counts ac ON ac.connection_id = bc.id
    WHERE bc.user_id = p_user_id
    AND bc.status = 'active'
    AND bc.disconnected_at IS NULL
    AND bc.encrypted_access_token IS NOT NULL
    ORDER BY bc.created_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_active_bank_connections(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_bank_connections(uuid) TO anon;

-- Add function documentation
COMMENT ON FUNCTION public.get_active_bank_connections(uuid) IS 'Retrieves active bank connections for a user with metadata including account counts and sync status.';
