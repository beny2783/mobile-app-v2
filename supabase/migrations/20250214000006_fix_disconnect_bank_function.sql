-- Drop the existing function
DROP FUNCTION IF EXISTS public.disconnect_bank(uuid, uuid);

-- Create the updated function
CREATE OR REPLACE FUNCTION public.disconnect_bank(p_connection_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
begin
  -- First verify the connection exists and belongs to the user
  if not exists (
    select 1
    from bank_connections
    where id = p_connection_id
    and user_id = p_user_id
  ) then
    raise exception 'Bank connection not found or unauthorized';
  end if;

  -- Update connection status
  update bank_connections
  set status = 'disconnected',
      disconnected_at = now(),
      encrypted_access_token = null,  -- Clear tokens
      encrypted_refresh_token = null
  where id = p_connection_id
  and user_id = p_user_id;

  -- Delete associated transactions for this specific connection
  delete from transactions
  where user_id = p_user_id
  and connection_id = p_connection_id;

  -- Delete associated balances for this specific connection
  delete from balances
  where user_id = p_user_id
  and connection_id = p_connection_id;

  -- Delete associated bank accounts for this specific connection
  delete from bank_accounts
  where user_id = p_user_id
  and connection_id = p_connection_id;

  -- Commit the transaction
  commit;
end;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.disconnect_bank(uuid, uuid) TO authenticated;

-- Add function documentation
COMMENT ON FUNCTION public.disconnect_bank(uuid, uuid) IS 'Safely disconnects a bank connection and removes all associated data for that specific connection.'; 