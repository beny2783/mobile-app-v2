-- Add status and disconnected_at columns if they don't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns 
                 where table_name = 'bank_connections' and column_name = 'status') then
    alter table bank_connections 
    add column status text not null default 'active';
  end if;

  if not exists (select 1 from information_schema.columns 
                 where table_name = 'bank_connections' and column_name = 'disconnected_at') then
    alter table bank_connections 
    add column disconnected_at timestamptz;
  end if;
end $$;

-- Add check constraint if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from pg_constraint where conname = 'bank_connections_status_check') then
    alter table bank_connections 
    add constraint bank_connections_status_check 
    check (status in ('active', 'disconnected'));
  end if;
end $$;

-- Update any null status values
update bank_connections 
set status = 'active' 
where status is null; 