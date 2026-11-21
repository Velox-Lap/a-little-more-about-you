-- The owner account is already configured in the live project.
-- Use only if you intentionally need to add or re-add an owner.
-- Replace OWNER_EMAIL_HERE with the exact email of the Supabase Auth user.
insert into private.app_admins (user_id)
select id from auth.users
where lower(email)=lower('OWNER_EMAIL_HERE')
on conflict (user_id) do nothing;
select u.id,u.email,a.created_at as owner_added_at
from auth.users u join private.app_admins a on a.user_id=u.id
where lower(u.email)=lower('OWNER_EMAIL_HERE');
