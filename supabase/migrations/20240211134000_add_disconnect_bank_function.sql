create or replace function disconnect_bank(p_connection_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  -- First verify the connection exists and belongs to the user
  select count(*)
  into v_count
  from bank_connections
  where id = p_connection_id
  and user_id = p_user_id;

  if v_count = 0 then
    raise exception 'Bank connection not found or unauthorized';
  end if;

  -- Update connection status
  update bank_connections
  set status = 'disconnected',
      disconnected_at = now(),
      encrypted_access_token = null,
      encrypted_refresh_token = null
  where id = p_connection_id
  and user_id = p_user_id;

  -- Delete associated transactions
  delete from transactions
  where user_id = p_user_id;

  -- Delete associated balances
  delete from balances
  where user_id = p_user_id
  and connection_id = p_connection_id;

  return true;
exception
  when others then
    raise notice 'Error in disconnect_bank: %', SQLERRM;
    return false;
end;
$$;

-- Update balances table
ALTER TABLE balances
ADD COLUMN IF NOT EXISTS account_name text,
ADD COLUMN IF NOT EXISTS available_balance numeric,
ADD COLUMN IF NOT EXISTS update_timestamp timestamptz,
ADD COLUMN IF NOT EXISTS account_type text,
ADD COLUMN IF NOT EXISTS provider_name text,
ADD COLUMN IF NOT EXISTS provider_logo_uri text;

-- Rename current to balance if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'balances' AND column_name = 'current') THEN
    ALTER TABLE balances RENAME COLUMN current TO balance;
  END IF;
END $$; 