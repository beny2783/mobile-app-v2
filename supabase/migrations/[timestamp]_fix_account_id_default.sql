-- First make the column nullable temporarily
alter table transactions alter column account_id drop not null;

-- Then set the default value
alter table transactions alter column account_id set default 'default';

-- Update any existing null values
update transactions set account_id = 'default' where account_id is null;

-- Finally make it not null again
alter table transactions alter column account_id set not null; 