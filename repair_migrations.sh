#!/bin/bash

# Mark old migrations as reverted
supabase migration repair --status reverted 20240211000000
supabase migration repair --status reverted 20240211115853
supabase migration repair --status reverted 20240211121544
supabase migration repair --status reverted 20240211122515
supabase migration repair --status reverted 20240211124344
supabase migration repair --status reverted 20240211124617
supabase migration repair --status reverted 20240211130308
supabase migration repair --status reverted 20240211131500
supabase migration repair --status reverted 20240211132000
supabase migration repair --status reverted 20240211133000
supabase migration repair --status reverted 20240211133500
supabase migration repair --status reverted 20240211134000
supabase migration repair --status reverted 20240211135000
supabase migration repair --status reverted 20240211141000
supabase migration repair --status reverted 20240212114500
supabase migration repair --status reverted 20240213000000
supabase migration repair --status reverted 20240213000001
supabase migration repair --status reverted 20240213000002
supabase migration repair --status reverted 20240213000003
supabase migration repair --status reverted 20240213000004
supabase migration repair --status reverted 20240213000005
supabase migration repair --status reverted 20240213000006
supabase migration repair --status reverted 20240213000007

# Mark base schema migrations as applied
supabase migration repair --status applied 20250213115759
supabase migration repair --status applied 20250213115911

# Mark gamification migrations as applied
supabase migration repair --status applied 20250214000000
supabase migration repair --status applied 20250214000001 