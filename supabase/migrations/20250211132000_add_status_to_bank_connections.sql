-- Add status column to bank_connections table
alter table bank_connections 
add column status text not null default 'active',
add column disconnected_at timestamptz;

-- Add check constraint to ensure valid status values
alter table bank_connections 
add constraint bank_connections_status_check 
check (status in ('active', 'disconnected'));

-- Update existing rows to have 'active' status
update bank_connections 
set status = 'active' 
where status is null; 