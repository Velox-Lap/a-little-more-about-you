-- Run this AFTER creating your own email/password user in Supabase Auth.
-- Replace the email below with the exact email used by your owner account.
-- This adds only that Auth user to the private owner allowlist.

insert into private.app_admins (user_id)
select id
from auth.users
where lower(email) = lower('OWNER_EMAIL_HERE')
on conflict (user_id) do nothing;

-- Verify that exactly one owner row is present for that account:
select u.id, u.email, a.created_at as owner_added_at
from auth.users u
join private.app_admins a on a.user_id = u.id
where lower(u.email) = lower('OWNER_EMAIL_HERE');
