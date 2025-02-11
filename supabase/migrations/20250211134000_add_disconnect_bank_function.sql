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

  return true;
exception
  when others then
    raise notice 'Error in disconnect_bank: %', SQLERRM;
    return false;
end;
$$; 