-- A Little More About You — reference schema.
-- Keep this file aligned with the live migrations.
-- Public visitors can submit; only approved owners can read response rows.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists private.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.app_admins enable row level security;
revoke all on private.app_admins from public, anon, authenticated;

drop policy if exists "No direct access to owner allowlist" on private.app_admins;
create policy "No direct access to owner allowlist"
on private.app_admins
for all
to anon, authenticated
using (false)
with check (false);

create or replace function private.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.app_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_app_admin() from public, anon;
grant execute on function private.is_app_admin() to authenticated;

create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  respondent_name text not null default '',
  answers jsonb not null,
  submitted_at timestamptz not null default now(),
  constraint questionnaire_responses_name_length
    check (char_length(respondent_name) <= 80),
  constraint questionnaire_responses_answers_object
    check (jsonb_typeof(answers) = 'object')
);

alter table public.questionnaire_responses enable row level security;

revoke all on public.questionnaire_responses from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Both public visitors and already-authenticated browsers may submit.
-- No non-owner role receives UPDATE or DELETE privileges.
grant insert on public.questionnaire_responses to anon, authenticated;
grant select on public.questionnaire_responses to authenticated;

drop policy if exists "Visitors can submit questionnaire responses" on public.questionnaire_responses;
create policy "Visitors can submit questionnaire responses"
on public.questionnaire_responses
for insert
to anon, authenticated
with check (
  jsonb_typeof(answers) = 'object'
  and char_length(respondent_name) <= 80
);

drop policy if exists "Only approved owner can read questionnaire responses" on public.questionnaire_responses;
create policy "Only approved owner can read questionnaire responses"
on public.questionnaire_responses
for select
to authenticated
using ((select private.is_app_admin()));

create or replace function public.is_questionnaire_owner()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_app_admin();
$$;

revoke all on function public.is_questionnaire_owner() from public, anon;
grant execute on function public.is_questionnaire_owner() to authenticated;
