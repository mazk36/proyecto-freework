create type public.user_role as enum ('company', 'freelancer');
create type public.business_problem_status as enum ('draft', 'open', 'paused', 'closed');

create table public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 100),
  role public.user_role not null,
  created_at timestamptz not null default now()
);

create table public.company_profiles (
  user_id uuid primary key references public.app_users (id) on delete cascade,
  company_name text not null check (char_length(company_name) between 2 and 160),
  industry text not null check (char_length(industry) between 2 and 100),
  country_code text not null default 'PE' check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_problems (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  company_user_id uuid not null references public.app_users (id) on delete restrict,
  status public.business_problem_status not null default 'draft',
  current_step integer not null default 1 check (current_step between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  description text not null default '' check (char_length(description) <= 3000),
  impacts text[] not null default '{}',
  industry_snapshot text not null default '',
  locations_count integer check (locations_count is null or locations_count between 0 and 1000000),
  people_affected integer check (people_affected is null or people_affected between 0 and 10000000),
  current_process text not null default '' check (char_length(current_process) <= 2000),
  current_tools text not null default '' check (char_length(current_tools) <= 1000),
  special_conditions text not null default '' check (char_length(special_conditions) <= 2000),
  objectives text[] not null default '{}',
  success_criteria text not null default '' check (char_length(success_criteria) <= 1500),
  budget_choice text not null default '' check (budget_choice in ('', 'under_1000', '1000_3000', '3000_5000', '5000_10000', 'over_10000', 'unknown')),
  currency text not null default 'PEN' check (currency ~ '^[A-Z]{3}$'),
  deadline_choice text not null default '' check (deadline_choice in ('', 'asap', 'under_two_weeks', 'within_one_month', 'one_to_three_months', 'flexible')),
  show_company_name boolean not null default false,
  reviewed_and_consented boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index business_problems_company_updated_idx
  on public.business_problems (company_user_id, updated_at desc);
create index business_problems_open_published_idx
  on public.business_problems (published_at desc)
  where status = 'open';

alter table public.app_users enable row level security;
alter table public.company_profiles enable row level security;
alter table public.business_problems enable row level security;

revoke all on table public.app_users from anon, authenticated;
revoke all on table public.company_profiles from anon, authenticated;
revoke all on table public.business_problems from anon, authenticated;
grant select on table public.app_users to authenticated;
create policy app_users_read_self on public.app_users
  for select to authenticated using (id = (select auth.uid()));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger company_profiles_updated_at
  before update on public.company_profiles
  for each row execute function public.set_updated_at();
create trigger business_problems_updated_at
  before update on public.business_problems
  for each row execute function public.set_updated_at();

create or replace function public.create_app_user_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_name text;
begin
  v_name := nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), '');
  if v_name is null then
    v_name := coalesce(nullif(pg_catalog.split_part(new.email, '@', 1), ''), 'Usuario MatchWork');
  end if;
  if char_length(v_name) > 100 then
    v_name := pg_catalog.left(v_name, 100);
  end if;

  if new.raw_user_meta_data ->> 'role' in ('company', 'freelancer') then
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  else
    v_role := 'freelancer'::public.user_role;
  end if;

  insert into public.app_users (id, full_name, role)
  values (new.id, v_name, v_role);
  return new;
end;
$$;

create trigger create_app_user_after_signup
  after insert on auth.users
  for each row execute function public.create_app_user_for_auth_user();

create or replace function public.require_company_user()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.app_users u
    where u.id = v_user_id and u.role = 'company'::public.user_role
  ) then
    raise exception 'company account required' using errcode = '42501';
  end if;
  return v_user_id;
end;
$$;

create or replace function public.get_company_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
  v_profile jsonb;
begin
  select pg_catalog.to_jsonb(p) into v_profile
  from public.company_profiles p where p.user_id = v_user_id;
  return v_profile;
end;
$$;

create or replace function public.save_company_profile(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
  v_company_name text := pg_catalog.btrim(coalesce(p_profile ->> 'company_name', ''));
  v_industry text := pg_catalog.btrim(coalesce(p_profile ->> 'industry', ''));
  v_country_code text := upper(coalesce(p_profile ->> 'country_code', 'PE'));
  v_profile public.company_profiles%rowtype;
begin
  if pg_catalog.jsonb_typeof(p_profile) is distinct from 'object'
     or char_length(v_company_name) not between 2 and 160
     or char_length(v_industry) not between 2 and 100
     or v_country_code !~ '^[A-Z]{2}$' then
    raise exception 'invalid company profile' using errcode = '22023';
  end if;

  insert into public.company_profiles (user_id, company_name, industry, country_code)
  values (v_user_id, v_company_name, v_industry, v_country_code)
  on conflict (user_id) do update set
    company_name = excluded.company_name,
    industry = excluded.industry,
    country_code = excluded.country_code
  returning * into v_profile;
  return pg_catalog.to_jsonb(v_profile);
end;
$$;

create or replace function public.get_my_company_problems()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
begin
  return (
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) order by p.updated_at desc), '[]'::jsonb)
    from public.business_problems p where p.company_user_id = v_user_id
  );
end;
$$;

create or replace function public.get_my_company_problem(p_problem_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
  v_problem jsonb;
begin
  select pg_catalog.to_jsonb(p) into v_problem
  from public.business_problems p
  where p.id = p_problem_id and p.company_user_id = v_user_id;
  return v_problem;
end;
$$;

create or replace function public.list_open_business_problems()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.user_role;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select u.role into v_role from public.app_users u where u.id = v_user_id;
  if v_role is distinct from 'freelancer'::public.user_role then
    raise exception 'freelancer account required' using errcode = '42501';
  end if;

  return (
    select coalesce(pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'description', p.description,
        'impacts', p.impacts,
        'industry_snapshot', p.industry_snapshot,
        'objectives', p.objectives,
        'success_criteria', p.success_criteria,
        'budget_choice', p.budget_choice,
        'currency', p.currency,
        'deadline_choice', p.deadline_choice,
        'show_company_name', p.show_company_name,
        'company_name', case when p.show_company_name then cp.company_name else null end,
        'published_at', p.published_at
      ) order by p.published_at desc
    ), '[]'::jsonb)
    from public.business_problems p
    left join public.company_profiles cp on cp.user_id = p.company_user_id
    where p.status = 'open'
  );
end;
$$;

create or replace function public.save_business_problem_draft(p_problem_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
  v_id uuid := coalesce(p_problem_id, pg_catalog.gen_random_uuid());
  v_current_status public.business_problem_status;
  v_industry text;
  v_country_code text;
  v_currency text;
  v_title text;
  v_description text;
  v_impacts text[];
  v_objectives text[];
  v_budget_choice text := coalesce(p_data ->> 'budget_choice', '');
  v_deadline_choice text := coalesce(p_data ->> 'deadline_choice', '');
  v_locations integer;
  v_people integer;
begin
  if pg_catalog.jsonb_typeof(p_data) is distinct from 'object' then
    raise exception 'invalid problem data' using errcode = '22023';
  end if;

  select cp.industry, cp.country_code into v_industry, v_country_code
  from public.company_profiles cp where cp.user_id = v_user_id;
  if v_industry is null then
    raise exception 'company profile required' using errcode = '42501';
  end if;
  v_currency := case v_country_code
    when 'PE' then 'PEN' when 'AR' then 'ARS' when 'CL' then 'CLP'
    when 'CO' then 'COP' when 'MX' then 'MXN' when 'US' then 'USD'
    when 'BR' then 'BRL' when 'ES' then 'EUR'
    else 'USD' end;

  v_title := pg_catalog.btrim(coalesce(p_data ->> 'title', ''));
  v_description := pg_catalog.btrim(coalesce(p_data ->> 'description', ''));
  if char_length(v_title) > 120 or char_length(v_description) > 3000
     or char_length(coalesce(p_data ->> 'current_process', '')) > 2000
     or char_length(coalesce(p_data ->> 'current_tools', '')) > 1000
     or char_length(coalesce(p_data ->> 'special_conditions', '')) > 2000
     or char_length(coalesce(p_data ->> 'success_criteria', '')) > 1500 then
    raise exception 'problem field too long' using errcode = '22023';
  end if;
  if coalesce(pg_catalog.jsonb_typeof(p_data -> 'impacts'), 'array') <> 'array'
     or coalesce(pg_catalog.jsonb_typeof(p_data -> 'objectives'), 'array') <> 'array' then
    raise exception 'invalid problem options' using errcode = '22023';
  end if;
  v_impacts := array(select pg_catalog.jsonb_array_elements_text(coalesce(p_data -> 'impacts', '[]'::jsonb)));
  v_objectives := array(select pg_catalog.jsonb_array_elements_text(coalesce(p_data -> 'objectives', '[]'::jsonb)));
  if exists (select 1 from pg_catalog.unnest(v_impacts) x where x not in ('time', 'errors', 'financial', 'customers', 'repetitive', 'other'))
     or exists (select 1 from pg_catalog.unnest(v_objectives) x where x not in ('save_time', 'reduce_errors', 'increase_sales', 'automate', 'organize', 'customer_service', 'other'))
     or v_budget_choice not in ('', 'under_1000', '1000_3000', '3000_5000', '5000_10000', 'over_10000', 'unknown')
     or v_deadline_choice not in ('', 'asap', 'under_two_weeks', 'within_one_month', 'one_to_three_months', 'flexible') then
    raise exception 'invalid problem options' using errcode = '22023';
  end if;
  v_locations := nullif(p_data ->> 'locations_count', '')::integer;
  v_people := nullif(p_data ->> 'people_affected', '')::integer;
  if v_locations is not null and v_locations not between 0 and 1000000 then
    raise exception 'invalid location count' using errcode = '22023';
  end if;
  if v_people is not null and v_people not between 0 and 10000000 then
    raise exception 'invalid people count' using errcode = '22023';
  end if;

  select p.status into v_current_status
  from public.business_problems p
  where p.id = v_id and p.company_user_id = v_user_id
  for update;

  if v_current_status is null and exists (select 1 from public.business_problems p where p.id = v_id) then
    raise exception 'problem not found' using errcode = '42501';
  elsif v_current_status is not null and v_current_status <> 'draft'::public.business_problem_status then
    raise exception 'problem cannot be edited' using errcode = '42501';
  end if;

  insert into public.business_problems (
    id, company_user_id, status, current_step, title, description, impacts, industry_snapshot,
    locations_count, people_affected, current_process, current_tools, special_conditions,
    objectives, success_criteria, budget_choice, currency, deadline_choice,
    show_company_name, reviewed_and_consented
  ) values (
    v_id, v_user_id, 'draft', coalesce(nullif(p_data ->> 'current_step', '')::integer, 1), v_title, v_description, v_impacts, v_industry,
    v_locations, v_people, pg_catalog.btrim(coalesce(p_data ->> 'current_process', '')),
    pg_catalog.btrim(coalesce(p_data ->> 'current_tools', '')),
    pg_catalog.btrim(coalesce(p_data ->> 'special_conditions', '')),
    v_objectives, pg_catalog.btrim(coalesce(p_data ->> 'success_criteria', '')),
    v_budget_choice, v_currency, v_deadline_choice,
    coalesce((p_data ->> 'show_company_name')::boolean, false),
    coalesce((p_data ->> 'reviewed_and_consented')::boolean, false)
  )
  on conflict (id) do update set
    current_step = excluded.current_step,
    title = excluded.title,
    description = excluded.description,
    impacts = excluded.impacts,
    industry_snapshot = excluded.industry_snapshot,
    locations_count = excluded.locations_count,
    people_affected = excluded.people_affected,
    current_process = excluded.current_process,
    current_tools = excluded.current_tools,
    special_conditions = excluded.special_conditions,
    objectives = excluded.objectives,
    success_criteria = excluded.success_criteria,
    budget_choice = excluded.budget_choice,
    currency = excluded.currency,
    deadline_choice = excluded.deadline_choice,
    show_company_name = excluded.show_company_name,
    reviewed_and_consented = excluded.reviewed_and_consented
  where public.business_problems.company_user_id = v_user_id
    and public.business_problems.status = 'draft'::public.business_problem_status;

  return v_id;
end;
$$;

create or replace function public.publish_business_problem(p_problem_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
  v_problem public.business_problems%rowtype;
begin
  select * into v_problem from public.business_problems p
  where p.id = p_problem_id and p.company_user_id = v_user_id for update;
  if not found then
    raise exception 'problem not found' using errcode = '42501';
  end if;
  if v_problem.status = 'open'::public.business_problem_status then
    return v_problem.id;
  end if;
  if v_problem.status <> 'draft'::public.business_problem_status then
    raise exception 'invalid status transition' using errcode = '22023';
  end if;
  if char_length(pg_catalog.btrim(v_problem.title)) not between 12 and 120
     or char_length(pg_catalog.btrim(v_problem.description)) not between 40 and 3000
     or coalesce(array_length(v_problem.objectives, 1), 0) < 1
     or v_problem.budget_choice = '' or v_problem.deadline_choice = ''
     or not v_problem.reviewed_and_consented then
    raise exception 'problem requires title, description, objective, budget, deadline and consent' using errcode = '22023';
  end if;

  update public.business_problems p
  set status = 'open'::public.business_problem_status,
      published_at = coalesce(p.published_at, now())
  where p.id = v_problem.id;
  return v_problem.id;
end;
$$;

create or replace function public.begin_business_problem_edit(p_problem_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
  v_status public.business_problem_status;
begin
  select p.status into v_status from public.business_problems p
  where p.id = p_problem_id and p.company_user_id = v_user_id for update;
  if not found then
    raise exception 'problem not found' using errcode = '42501';
  end if;
  if v_status = 'closed'::public.business_problem_status then
    raise exception 'closed problem cannot be edited' using errcode = '22023';
  end if;
  if v_status <> 'draft'::public.business_problem_status then
    update public.business_problems p
    set status = 'draft'::public.business_problem_status, published_at = null,
        reviewed_and_consented = false
    where p.id = p_problem_id;
  end if;
  return p_problem_id;
end;
$$;

create or replace function public.transition_business_problem(p_problem_id uuid, p_action text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
  v_status public.business_problem_status;
  v_next_status public.business_problem_status;
begin
  select p.status into v_status from public.business_problems p
  where p.id = p_problem_id and p.company_user_id = v_user_id for update;
  if not found then
    raise exception 'problem not found' using errcode = '42501';
  end if;

  if p_action = 'pause' and v_status = 'open'::public.business_problem_status then
    v_next_status := 'paused'::public.business_problem_status;
  elsif p_action = 'resume' and v_status = 'paused'::public.business_problem_status then
    v_next_status := 'open'::public.business_problem_status;
  elsif p_action = 'close' and v_status in ('open'::public.business_problem_status, 'paused'::public.business_problem_status) then
    v_next_status := 'closed'::public.business_problem_status;
  else
    raise exception 'invalid status transition' using errcode = '22023';
  end if;

  update public.business_problems p set status = v_next_status
  where p.id = p_problem_id;
  return p_problem_id;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.create_app_user_for_auth_user() from public, anon, authenticated;
revoke all on function public.require_company_user() from public, anon, authenticated;
revoke all on function public.get_company_profile() from public, anon, authenticated;
revoke all on function public.save_company_profile(jsonb) from public, anon, authenticated;
revoke all on function public.get_my_company_problems() from public, anon, authenticated;
revoke all on function public.get_my_company_problem(uuid) from public, anon, authenticated;
revoke all on function public.list_open_business_problems() from public, anon, authenticated;
revoke all on function public.save_business_problem_draft(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.publish_business_problem(uuid) from public, anon, authenticated;
revoke all on function public.begin_business_problem_edit(uuid) from public, anon, authenticated;
revoke all on function public.transition_business_problem(uuid, text) from public, anon, authenticated;
grant execute on function public.get_company_profile() to authenticated;
grant execute on function public.save_company_profile(jsonb) to authenticated;
grant execute on function public.get_my_company_problems() to authenticated;
grant execute on function public.get_my_company_problem(uuid) to authenticated;
grant execute on function public.list_open_business_problems() to authenticated;
grant execute on function public.save_business_problem_draft(uuid, jsonb) to authenticated;
grant execute on function public.publish_business_problem(uuid) to authenticated;
grant execute on function public.begin_business_problem_edit(uuid) to authenticated;
grant execute on function public.transition_business_problem(uuid, text) to authenticated;

comment on table public.business_problems is
  'Company-owned problems. Client roles have no direct table privileges; authenticated access is through owner-checking RPCs.';
comment on function public.list_open_business_problems() is
  'Returns only public listing fields for open problems. Company identity is included only when the owner opted to show it.';
