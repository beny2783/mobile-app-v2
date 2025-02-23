-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.set_notice_logging(boolean);

-- Create the new function
CREATE OR REPLACE FUNCTION public.set_notice_logging(enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF enabled THEN
        SET client_min_messages TO notice;
    ELSE
        SET client_min_messages TO warning;
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_notice_logging(boolean) TO authenticated;

-- Add function documentation
COMMENT ON FUNCTION public.set_notice_logging(boolean) IS 'Enables or disables notice logging for the current database session.'; 