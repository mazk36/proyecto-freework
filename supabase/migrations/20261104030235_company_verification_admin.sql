-- Company verification and moderation. Private tables are accessible only through RPCs.
alter table public.app_users
  add column suspended_at timestamptz,
  add column suspension_reason text;
alter table public.business_problems
  add column suspended_at timestamptz,
  add column suspension_reason text;

create table public.admins (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.company_verifications (
  company_user_id uuid primary key references public.company_profiles(user_id) on delete cascade,
  status text not null check (status in ('pending', 'verified', 'rejected')),
  legal_name text not null,
  country_code text not null,
  tax_id text not null,
  website_url text,
  corporate_email text,
  linkedin_url text,
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
create index company_verifications_queue_idx on public.company_verifications(status, submitted_at, company_user_id);
create table public.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.app_users(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  metadata jsonb not null default '{}'::jsonb
);
create table public.app_settings (
  key text primary key,
  value jsonb not null check (key <> 'require_company_verification_to_publish' or pg_catalog.jsonb_typeof(value) = 'boolean'),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.app_users(id) on delete set null
);
insert into public.app_settings(key, value)
values ('require_company_verification_to_publish', 'false'::jsonb);
insert into public.rate_limit_policies(action, max_events, window_seconds, description)
values ('company_verification_submit', 5, 86400, 'Submit or revise company verification');

alter table public.admins enable row level security;
alter table public.company_verifications enable row level security;
alter table public.admin_actions enable row level security;
alter table public.app_settings enable row level security;
revoke all on public.admins, public.company_verifications, public.admin_actions, public.app_settings from public, anon, authenticated;
revoke all on sequence public.admin_actions_id_seq from public, anon, authenticated;

create function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

create function public.require_admin()
returns uuid language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;
revoke all on function public.require_admin() from public, anon, authenticated;

create function public.require_active_account()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_suspended_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- The existing interaction RPCs take NO KEY UPDATE on the account; use the
  -- same lock here so concurrent submissions cannot deadlock on lock upgrades.
  select u.suspended_at into v_suspended_at from public.app_users u where u.id = auth.uid() for no key update;
  if not found then
    raise exception 'account required' using errcode = '42501';
  end if;
  if v_suspended_at is not null then
    raise exception 'account suspended' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.require_active_account() from public, anon, authenticated;

create function public.get_my_account_status()
returns table(suspended boolean, reason text)
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  return query select u.suspended_at is not null, u.suspension_reason
    from public.app_users u where u.id = auth.uid();
end;
$$;
revoke all on function public.get_my_account_status() from public, anon, authenticated;
grant execute on function public.get_my_account_status() to authenticated;

-- Normalize surrounding whitespace consistently for verification input and reasons.
create function public.trim_verification_input(p_value text)
returns text language sql immutable set search_path = ''
as $$ select pg_catalog.regexp_replace(p_value, '^[[:space:]]+|[[:space:]]+$', '', 'g'); $$;
revoke all on function public.trim_verification_input(text) from public, anon, authenticated;

-- These validators deliberately check RUC format only; no checksum is inferred.
create function public.is_valid_peruvian_ruc(p_value text)
returns boolean language sql immutable set search_path = ''
as $$ select coalesce(public.trim_verification_input(p_value) ~ '^[0-9]{11}$', false); $$;
create function public.is_free_email_domain(p_email text)
returns boolean language sql immutable set search_path = ''
as $$
  select pg_catalog.lower(pg_catalog.split_part(public.trim_verification_input(coalesce(p_email, '')), '@', 2)) = any(array[
    'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es',
    'live.com', 'live.es', 'msn.com', 'yahoo.com', 'yahoo.es', 'yahoo.com.pe',
    'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net', 'aol.com'
  ]::text[]);
$$;
create function public.is_valid_verification_url(p_url text, p_linkedin_only boolean default false)
returns boolean language plpgsql immutable set search_path = ''
as $$
declare
  v_url text := public.trim_verification_input(coalesce(p_url, ''));
  v_authority text;
  v_host text;
  v_port text;
begin
  if pg_catalog.char_length(v_url) > 2048 or v_url !~* '^https://[^/?#[:space:]\\]+([/?#][^[:space:]\\]*)?$' then
    return false;
  end if;
  v_authority := pg_catalog.substring(pg_catalog.lower(v_url), '^https://([^/?#]+)');
  if pg_catalog.strpos(v_authority, '@') > 0 or pg_catalog.strpos(v_authority, '%') > 0 then return false; end if;
  v_port := pg_catalog.substring(v_authority, ':([0-9]{1,5})$');
  if v_port is not null and v_port::integer > 65535 then return false; end if;
  if pg_catalog.left(v_authority, 1) = '[' then
    if v_authority !~ '^\[[0-9a-f:.]+\](:[0-9]{1,5})?$' then return false; end if;
    begin
      if pg_catalog.family(pg_catalog.substring(v_authority, '^\[([0-9a-f:.]+)\]')::pg_catalog.inet) <> 6 then return false; end if;
    exception when invalid_text_representation then return false;
    end;
    v_host := v_authority;
  else
    if v_authority !~ '^[^:]+(:[0-9]{1,5})?$' then return false; end if;
    v_host := pg_catalog.split_part(v_authority, ':', 1);
    if v_host !~* '^([[:alnum:]]([[:alnum:]-]{0,61}[[:alnum:]])?[.])*[[:alnum:]]([[:alnum:]-]{0,61}[[:alnum:]])?$' then return false; end if;
  end if;
  if coalesce(p_linkedin_only, false) and v_host !~ '(^|[.])linkedin[.]com$' then return false; end if;
  return true;
end;
$$;
-- Called only after HTTPS validation; paths and queries retain their original case.
create function public.normalize_verification_url(p_url text)
returns text language plpgsql immutable set search_path = ''
as $$
declare
  v_url text := public.trim_verification_input(p_url);
  v_rest text;
  v_authority text;
begin
  if v_url is null then return null; end if;
  v_rest := pg_catalog.substr(v_url, 9);
  v_authority := pg_catalog.substring(v_rest, '^[^/?#]+');
  return 'https://' || pg_catalog.lower(v_authority) || pg_catalog.substr(v_rest, pg_catalog.char_length(v_authority) + 1);
end;
$$;
revoke all on function public.normalize_verification_url(text) from public, anon, authenticated;

revoke all on function public.is_valid_peruvian_ruc(text) from public, anon, authenticated;
revoke all on function public.is_free_email_domain(text) from public, anon, authenticated;
revoke all on function public.is_valid_verification_url(text, boolean) from public, anon, authenticated;

-- Shared state matrix is also exercised by pgTAP and Vitest.
create function public.company_verification_transition(p_status text, p_action text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when p_action = 'submit' and p_status in ('not_requested', 'pending', 'rejected') then 'pending'
    when p_action = 'verify' and p_status in ('pending', 'verified') then 'verified'
    when p_action = 'reject' and p_status in ('pending', 'rejected') then 'rejected'
    when p_action = 'undo' and p_status = 'verified' then 'pending'
    else null end;
$$;
revoke all on function public.company_verification_transition(text, text) from public, anon, authenticated;

create function public.get_my_company_verification()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := public.require_company_user(); v_result jsonb;
begin
  select pg_catalog.jsonb_build_object(
    'status', coalesce(v.status, 'not_requested'), 'legal_name', v.legal_name,
    'country_code', coalesce(v.country_code, c.country_code), 'tax_id', v.tax_id,
    'website_url', v.website_url, 'corporate_email', v.corporate_email,
    'linkedin_url', v.linkedin_url, 'rejection_reason', v.rejection_reason,
    'submitted_at', v.submitted_at, 'verified_at', v.verified_at, 'updated_at', v.updated_at
  ) into v_result from public.company_profiles c
  left join public.company_verifications v on v.company_user_id = c.user_id
  where c.user_id = v_user_id;
  if v_result is null then
    return pg_catalog.jsonb_build_object('status', 'not_requested', 'country_code', null);
  end if;
  return v_result;
end;
$$;

create function public.submit_company_verification(p_data jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
  v_country text; v_status text;
  v_name text := public.trim_verification_input(coalesce(p_data ->> 'legal_name', ''));
  v_tax text := pg_catalog.upper(public.trim_verification_input(coalesce(p_data ->> 'tax_id', '')));
  v_website text := nullif(public.trim_verification_input(p_data ->> 'website_url'), '');
  v_email text := nullif(pg_catalog.lower(public.trim_verification_input(p_data ->> 'corporate_email')), '');
  v_linkedin text := nullif(public.trim_verification_input(p_data ->> 'linkedin_url'), '');
begin
  if pg_catalog.jsonb_typeof(p_data) is distinct from 'object'
     or (p_data - array['legal_name','tax_id','website_url','corporate_email','linkedin_url']::text[]) <> '{}'::jsonb then
    raise exception 'invalid verification data' using errcode = '22023';
  end if;
  -- Company profile upserts also lock the actor account before the profile row.
  perform public.require_active_account();
  select c.country_code into v_country from public.company_profiles c where c.user_id = v_user_id for update;
  if not found then raise exception 'company profile required' using errcode = '42501'; end if;
  select v.status into v_status from public.company_verifications v where v.company_user_id = v_user_id for update;
  if public.company_verification_transition(coalesce(v_status, 'not_requested'), 'submit') is null then raise exception 'verified company cannot resubmit' using errcode = '22023'; end if;
  if v_name = ''
     or (v_country = 'PE' and not public.is_valid_peruvian_ruc(v_tax))
     or (v_country <> 'PE' and pg_catalog.char_length(v_tax) not between 4 and 30)
     or (v_website is null and v_email is null)
     or (v_website is not null and not public.is_valid_verification_url(v_website))
     or (v_linkedin is not null and not public.is_valid_verification_url(v_linkedin, true))
     or (v_email is not null and (pg_catalog.char_length(v_email) > 254
       or v_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9.-]*[a-z0-9])?[.][a-z]{2,}$'
       or public.is_free_email_domain(v_email))) then
    raise exception 'invalid verification data' using errcode = '22023';
  end if;
  v_website := public.normalize_verification_url(v_website);
  v_linkedin := public.normalize_verification_url(v_linkedin);
  perform public.enforce_rate_limit('company_verification_submit');
  insert into public.company_verifications(company_user_id, status, legal_name, country_code, tax_id, website_url, corporate_email, linkedin_url)
  values (v_user_id, 'pending', v_name, v_country, v_tax, v_website, v_email, v_linkedin)
  on conflict (company_user_id) do update set status = 'pending', legal_name = excluded.legal_name,
    country_code = excluded.country_code, tax_id = excluded.tax_id, website_url = excluded.website_url,
    corporate_email = excluded.corporate_email, linkedin_url = excluded.linkedin_url,
    rejection_reason = null, submitted_at = pg_catalog.clock_timestamp(), verified_at = null,
    updated_at = pg_catalog.clock_timestamp();
  return public.get_my_company_verification();
end;
$$;
revoke all on function public.get_my_company_verification() from public, anon, authenticated;
revoke all on function public.submit_company_verification(jsonb) from public, anon, authenticated;
grant execute on function public.get_my_company_verification() to authenticated;
grant execute on function public.submit_company_verification(jsonb) to authenticated;

create function public.admin_list_verification_requests(
  p_status text default 'pending', p_after_submitted_at timestamptz default null,
  p_after_company_user_id uuid default null, p_limit integer default 25
)
returns table(company_user_id uuid, company_name text, legal_name text, country_code text, tax_id text,
  website_url text, corporate_email text, linkedin_url text, status text, rejection_reason text,
  submitted_at timestamptz, verified_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  if p_status not in ('pending', 'verified', 'rejected', 'all') or p_status is null
    or ((p_after_submitted_at is null) <> (p_after_company_user_id is null)) then
    raise exception 'invalid admin filter or cursor' using errcode = '22023';
  end if;
  return query select v.company_user_id, c.company_name, v.legal_name, v.country_code, v.tax_id,
    v.website_url, v.corporate_email, v.linkedin_url, v.status, v.rejection_reason,
    v.submitted_at, v.verified_at, v.updated_at
  from public.company_verifications v join public.company_profiles c on c.user_id = v.company_user_id
  where (p_status = 'all' or v.status = p_status)
    and (p_after_submitted_at is null or (v.submitted_at, v.company_user_id) > (p_after_submitted_at, p_after_company_user_id))
  order by v.submitted_at, v.company_user_id limit least(greatest(coalesce(p_limit, 25), 1), 100);
end;
$$;

create function public.admin_verify_company(p_company_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := public.require_admin(); v_status text;
begin
  perform public.require_active_account();
  select v.status into v_status from public.company_verifications v where v.company_user_id = p_company_user_id for update;
  if not found then raise exception 'verification request not found' using errcode = 'P0002'; end if;
  if v_status = 'verified' then return; end if;
  if public.company_verification_transition(v_status, 'verify') is null then raise exception 'invalid verification transition' using errcode = '22023'; end if;
  update public.company_verifications v set status = 'verified', verified_at = pg_catalog.clock_timestamp(),
    rejection_reason = null, updated_at = pg_catalog.clock_timestamp() where v.company_user_id = p_company_user_id;
  insert into public.admin_actions(admin_id, action, target_type, target_id)
  values (v_admin, 'verify_company', 'company', p_company_user_id::text);
end;
$$;

create function public.admin_reject_company(p_company_user_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := public.require_admin(); v_status text; v_reason text := public.trim_verification_input(p_reason);
begin
  perform public.require_active_account();
  if v_reason is null or pg_catalog.char_length(v_reason) not between 5 and 200 then
    raise exception 'invalid rejection reason' using errcode = '22023';
  end if;
  select v.status into v_status from public.company_verifications v where v.company_user_id = p_company_user_id for update;
  if not found then raise exception 'verification request not found' using errcode = 'P0002'; end if;
  if v_status = 'rejected' and exists (select 1 from public.company_verifications v where v.company_user_id = p_company_user_id and v.rejection_reason = v_reason) then return; end if;
  if v_status <> 'pending' then raise exception 'invalid verification transition' using errcode = '22023'; end if;
  update public.company_verifications v set status = 'rejected', rejection_reason = v_reason,
    verified_at = null, updated_at = pg_catalog.clock_timestamp() where v.company_user_id = p_company_user_id;
  insert into public.admin_actions(admin_id, action, target_type, target_id, reason)
  values (v_admin, 'reject_company', 'company', p_company_user_id::text, v_reason);
end;
$$;

-- Supports the 8-second undo offered after a successful verification.
create function public.admin_undo_company_verification(p_company_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := public.require_admin(); v_status text; v_action public.admin_actions%rowtype;
begin
  perform public.require_active_account();
  select v.status into v_status from public.company_verifications v where v.company_user_id = p_company_user_id for update;
  if not found then raise exception 'verification request not found' using errcode = 'P0002'; end if;
  select a.* into v_action from public.admin_actions a
    where a.target_type = 'company' and a.target_id = p_company_user_id::text
    order by a.id desc limit 1;
  if v_status = 'pending' and v_action.action = 'undo_company_verification' and v_action.admin_id = v_admin then return; end if;
  if v_status <> 'verified' or v_action.action is distinct from 'verify_company'
    or v_action.admin_id is distinct from v_admin or v_action.created_at < pg_catalog.clock_timestamp() - interval '8 seconds' then
    raise exception 'verification undo expired' using errcode = '22023';
  end if;
  update public.company_verifications v set status = 'pending', verified_at = null,
    updated_at = pg_catalog.clock_timestamp() where v.company_user_id = p_company_user_id;
  insert into public.admin_actions(admin_id, action, target_type, target_id, metadata)
  values (v_admin, 'undo_company_verification', 'company', p_company_user_id::text,
    pg_catalog.jsonb_build_object('reverts_action_id', v_action.id));
end;
$$;

-- Escape LIKE metacharacters while retaining bound parameters and ordinary query plans.
create function public.escape_admin_search(p_query text)
returns text language sql immutable set search_path = ''
as $$
  select pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(
    pg_catalog.lower(pg_catalog.btrim(coalesce(p_query, ''))), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');
$$;
revoke all on function public.escape_admin_search(text) from public, anon, authenticated;

create function public.admin_list_users(
  p_search text default '', p_role text default 'all', p_suspension text default 'all',
  p_before_created_at timestamptz default null, p_before_id uuid default null, p_limit integer default 25
)
returns table(user_id uuid, full_name text, role public.user_role, email text,
  created_at timestamptz, suspended_at timestamptz, suspension_reason text)
language plpgsql security definer set search_path = ''
as $$
declare v_query text := public.escape_admin_search(p_search);
begin
  perform public.require_admin();
  if p_role is null or p_role not in ('all', 'company', 'freelancer')
    or p_suspension is null or p_suspension not in ('all', 'active', 'suspended')
    or ((p_before_created_at is null) <> (p_before_id is null)) then
    raise exception 'invalid admin filter or cursor' using errcode = '22023';
  end if;
  return query select u.id, u.full_name, u.role, a.email::text, u.created_at, u.suspended_at, u.suspension_reason
    from public.app_users u join auth.users a on a.id = u.id
    where (p_role = 'all' or u.role::text = p_role)
      and (p_suspension = 'all' or (p_suspension = 'active' and u.suspended_at is null)
        or (p_suspension = 'suspended' and u.suspended_at is not null))
      and (pg_catalog.lower(u.full_name) like '%' || v_query || '%' escape E'\\'
        or pg_catalog.lower(coalesce(a.email, '')) like '%' || v_query || '%' escape E'\\')
      and (p_before_created_at is null or (u.created_at, u.id) < (p_before_created_at, p_before_id))
    order by u.created_at desc, u.id desc limit least(greatest(coalesce(p_limit, 25), 1), 100);
end;
$$;

create function public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := public.require_admin(); v_at timestamptz; v_reason text := public.trim_verification_input(p_reason);
begin
  if p_suspended is null or v_reason is null or v_reason = '' then
    raise exception 'invalid suspension reason' using errcode = '22023';
  end if;
  if p_suspended and (p_user_id = v_admin or exists (select 1 from public.admins a where a.user_id = p_user_id)) then
    raise exception 'cannot suspend an admin' using errcode = '42501';
  end if;
  perform public.require_active_account();
  select u.suspended_at into v_at from public.app_users u where u.id = p_user_id for update;
  if not found then raise exception 'user not found' using errcode = 'P0002'; end if;
  if p_suspended and (p_user_id = v_admin or exists (select 1 from public.admins a where a.user_id = p_user_id)) then
    raise exception 'cannot suspend an admin' using errcode = '42501';
  end if;
  if (v_at is not null) = p_suspended then return; end if;
  update public.app_users u set suspended_at = case when p_suspended then pg_catalog.clock_timestamp() else null end,
    suspension_reason = case when p_suspended then v_reason else null end where u.id = p_user_id;
  insert into public.admin_actions(admin_id, action, target_type, target_id, reason)
  values (v_admin, case when p_suspended then 'suspend_user' else 'reactivate_user' end, 'user', p_user_id::text, v_reason);
end;
$$;

create function public.admin_list_problems(
  p_search text default '', p_status text default 'all',
  p_before_sort_at timestamptz default null, p_before_id uuid default null, p_limit integer default 25
)
returns table(problem_id uuid, title text, company_user_id uuid, company_name text, company_verified boolean,
  budget_choice text, currency text, published_at timestamptz, sort_at timestamptz,
  proposal_count bigint, status public.business_problem_status, suspended_at timestamptz, suspension_reason text)
language plpgsql security definer set search_path = ''
as $$
declare v_query text := public.escape_admin_search(p_search);
begin
  perform public.require_admin();
  if p_status is null or p_status not in ('all', 'draft', 'open', 'paused', 'closed', 'suspended')
    or ((p_before_sort_at is null) <> (p_before_id is null)) then
    raise exception 'invalid admin filter or cursor' using errcode = '22023';
  end if;
  return query select b.id, b.title, b.company_user_id, c.company_name,
    coalesce(v.status = 'verified', false), b.budget_choice, b.currency, b.published_at,
    coalesce(b.published_at, b.created_at),
    (select pg_catalog.count(*) from public.proposals p where p.problem_id = b.id and p.status = 'submitted'),
    b.status, b.suspended_at, b.suspension_reason
  from public.business_problems b left join public.company_profiles c on c.user_id = b.company_user_id
  left join public.company_verifications v on v.company_user_id = b.company_user_id
  where (p_status = 'all' or (p_status = 'suspended' and b.suspended_at is not null)
      or (p_status <> 'suspended' and b.suspended_at is null and b.status::text = p_status))
    and (pg_catalog.lower(b.title) like '%' || v_query || '%' escape E'\\'
      or pg_catalog.lower(coalesce(c.company_name, '')) like '%' || v_query || '%' escape E'\\')
    and (p_before_sort_at is null or (coalesce(b.published_at, b.created_at), b.id) < (p_before_sort_at, p_before_id))
  order by coalesce(b.published_at, b.created_at) desc, b.id desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100);
end;
$$;

create function public.admin_set_problem_suspended(p_problem_id uuid, p_suspended boolean, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := public.require_admin(); v_at timestamptz; v_reason text := public.trim_verification_input(p_reason);
begin
  if p_suspended is null or v_reason is null or v_reason = '' then
    raise exception 'invalid suspension reason' using errcode = '22023';
  end if;
  -- Problem before account: consistent with proposal and interaction RPCs.
  select b.suspended_at into v_at from public.business_problems b where b.id = p_problem_id for update;
  if not found then raise exception 'problem not found' using errcode = 'P0002'; end if;
  perform public.require_active_account();
  if (v_at is not null) = p_suspended then return; end if;
  update public.business_problems b set suspended_at = case when p_suspended then pg_catalog.clock_timestamp() else null end,
    suspension_reason = case when p_suspended then v_reason else null end where b.id = p_problem_id;
  insert into public.admin_actions(admin_id, action, target_type, target_id, reason)
  values (v_admin, case when p_suspended then 'suspend_problem' else 'reactivate_problem' end, 'problem', p_problem_id::text, v_reason);
end;
$$;

create function public.admin_get_summary()
returns table(pending_verifications bigint, verified_companies bigint, open_problems bigint, active_freelancers bigint)
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  return query select
    (select pg_catalog.count(*) from public.company_verifications v where v.status = 'pending'),
    (select pg_catalog.count(*) from public.company_verifications v where v.status = 'verified'),
    c.open_problems, c.freelancers_active from public.get_public_counters() c;
end;
$$;
create function public.admin_get_settings()
returns table(key text, value jsonb, updated_at timestamptz, updated_by uuid)
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_admin();
  return query select s.key, s.value, s.updated_at, s.updated_by from public.app_settings s order by s.key;
end;
$$;
create function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_admin uuid := public.require_admin(); v_old jsonb;
begin
  perform public.require_active_account();
  if p_key is distinct from 'require_company_verification_to_publish' or pg_catalog.jsonb_typeof(p_value) is distinct from 'boolean' then
    raise exception 'invalid app setting' using errcode = '22023';
  end if;
  select s.value into v_old from public.app_settings s where s.key = p_key for update;
  if not found then raise exception 'setting not found' using errcode = 'P0002'; end if;
  if v_old = p_value then return; end if;
  update public.app_settings s set value = p_value, updated_at = pg_catalog.clock_timestamp(), updated_by = v_admin where s.key = p_key;
  insert into public.admin_actions(admin_id, action, target_type, target_id, metadata)
  values (v_admin, 'set_setting', 'setting', p_key, pg_catalog.jsonb_build_object('old_value', v_old, 'new_value', p_value));
end;
$$;

revoke all on function public.admin_list_verification_requests(text, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_verify_company(uuid) from public, anon, authenticated;
revoke all on function public.admin_reject_company(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_undo_company_verification(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_users(text, text, text, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_set_user_suspended(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_list_problems(text, text, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_set_problem_suspended(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_get_summary() from public, anon, authenticated;
revoke all on function public.admin_get_settings() from public, anon, authenticated;
revoke all on function public.admin_set_setting(text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_list_verification_requests(text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_verify_company(uuid) to authenticated;
grant execute on function public.admin_reject_company(uuid, text) to authenticated;
grant execute on function public.admin_undo_company_verification(uuid) to authenticated;
grant execute on function public.admin_list_users(text, text, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_set_user_suspended(uuid, boolean, text) to authenticated;
grant execute on function public.admin_list_problems(text, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_set_problem_suspended(uuid, boolean, text) to authenticated;
grant execute on function public.admin_get_summary() to authenticated;
grant execute on function public.admin_get_settings() to authenticated;
grant execute on function public.admin_set_setting(text, jsonb) to authenticated;


-- Existing RPCs retain their lock order and validation; moderation adds guards.
create or replace function public.enforce_rate_limit(p_action text, p_scope uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_policy public.rate_limit_policies%rowtype;
  v_now timestamptz;
  v_threshold_at timestamptz;
  v_retry_seconds bigint;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  perform public.require_active_account();
  select p.* into v_policy from public.rate_limit_policies p where p.action = p_action;
  if not found then
    raise exception 'unknown rate limit action' using errcode = 'XX000';
  end if;

  -- The action lock also protects unscoped counts from concurrent scoped calls.
  -- Scoped calls then take their own lock in a consistent order.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rate-limit:' || v_user_id::text || ':' || p_action, 0)
  );
  if p_scope is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('rate-limit:' || v_user_id::text || ':' || p_action || ':' || p_scope::text, 0)
    );
  end if;
  v_now := pg_catalog.clock_timestamp();

  -- The Nth most recent event determines when a slot is actually available,
  -- including after an administrator reduces the limit below the current count.
  select e.created_at into v_threshold_at from public.rate_limit_events e
  where e.user_id = v_user_id and e.action = p_action
    and (p_scope is null or e.scope = p_scope)
    and e.created_at >= v_now - pg_catalog.make_interval(secs => v_policy.window_seconds)
  order by e.created_at desc, e.id desc
  offset (v_policy.max_events - 1) limit 1;
  if found then
    v_retry_seconds := greatest(1, pg_catalog.ceil(extract(epoch from (
      v_threshold_at + pg_catalog.make_interval(secs => v_policy.window_seconds) - v_now
    )))::bigint);
    raise exception 'rate limit exceeded'
      using errcode = '54000', hint = 'Retry after ' || v_retry_seconds::text || ' seconds.';
  end if;

  -- Bound cleanup work and skip rows already being removed by another action.
  -- Preserve older events if an administrator configured a window over seven days.
  delete from public.rate_limit_events e where e.id in (
    select old.id from public.rate_limit_events old
    where old.user_id = v_user_id and old.created_at < v_now - interval '7 days'
      and old.created_at < v_now - coalesce((
        select greatest(interval '7 days', pg_catalog.make_interval(secs => p.window_seconds))
        from public.rate_limit_policies p where p.action = old.action
      ), interval '7 days')
    order by old.created_at, old.id
    limit 25 for update skip locked
  );
  -- Additional bounded cleanup for this exact user and action. Keep one extra
  -- full window as margin and retain the existing cross-action seven-day purge.
  delete from public.rate_limit_events e where e.id in (
    select old.id from public.rate_limit_events old
    where old.user_id = v_user_id and old.action = p_action
      and old.created_at < v_now - pg_catalog.make_interval(secs => v_policy.window_seconds * 2.0)
    order by old.created_at, old.id limit 25 for update skip locked
  );
  insert into public.rate_limit_events (user_id, action, scope, created_at)
  values (v_user_id, p_action, p_scope, v_now);
end;
$$;

create or replace function public.save_proposal_draft(p_problem_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_freelancer_user();
  v_proposal public.proposals%rowtype;
  v_id uuid;
  v_price numeric;
  v_problem_title text;
  v_problem_suspended timestamptz;
begin
  if pg_catalog.jsonb_typeof(p_data) is distinct from 'object' then
    raise exception 'invalid proposal data' using errcode = '22023';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_each(p_data) as item(key, value)
    where item.key not in (
      'id', 'diagnosis', 'solution', 'deliverables', 'timeline', 'price',
      'currency', 'recurring_costs', 'maintenance_warranty', 'related_experience'
    )
      or (item.key = 'id' and pg_catalog.jsonb_typeof(item.value) <> 'string')
      or (item.key = 'currency' and pg_catalog.jsonb_typeof(item.value) <> 'string')
      or (item.key = 'price' and pg_catalog.jsonb_typeof(item.value) not in ('number', 'null'))
      or (item.key in (
        'diagnosis', 'solution', 'deliverables', 'timeline', 'recurring_costs',
        'maintenance_warranty', 'related_experience'
      ) and pg_catalog.jsonb_typeof(item.value) not in ('string', 'null'))
  ) then
    raise exception 'invalid proposal data' using errcode = '22023';
  end if;
  if p_data ? 'currency' and p_data ->> 'currency' not in ('PEN', 'USD') then
    raise exception 'invalid proposal currency' using errcode = '22023';
  end if;
  if pg_catalog.char_length(p_data ->> 'diagnosis') > 5000
     or pg_catalog.char_length(p_data ->> 'solution') > 5000
     or pg_catalog.char_length(p_data ->> 'deliverables') > 5000
     or pg_catalog.char_length(p_data ->> 'timeline') > 300
     or pg_catalog.char_length(p_data ->> 'recurring_costs') > 2000
     or pg_catalog.char_length(p_data ->> 'maintenance_warranty') > 2000
     or pg_catalog.char_length(p_data ->> 'related_experience') > 2000 then
    raise exception 'proposal field too long' using errcode = '22023';
  end if;
  if p_data ->> 'price' is not null then
    v_price := (p_data ->> 'price')::numeric;
    if v_price < 0 or v_price > 9999999999.99 then
      raise exception 'invalid proposal price' using errcode = '22023';
    end if;
    if v_price <> pg_catalog.round(v_price, 2) then
      raise exception 'invalid proposal price' using errcode = '22023';
    end if;
  end if;

  -- A shared row lock keeps the problem open until this transaction finishes.
  select p.title, p.suspended_at into v_problem_title, v_problem_suspended from public.business_problems p
  where p.id = p_problem_id and p.status = 'open'::public.business_problem_status
  for share;
  if not found then
    raise exception 'open problem required' using errcode = '22023';
  end if;
  if v_problem_suspended is not null then raise exception 'problem suspended' using errcode = 'P0001'; end if;

  if p_data ? 'id' then
    begin
      v_id := (p_data ->> 'id')::uuid;
    exception when invalid_text_representation then
      raise exception 'invalid proposal id' using errcode = '22023';
    end;

    select p.* into v_proposal from public.proposals p
    where p.id = v_id and p.problem_id = p_problem_id and p.freelancer_id = v_user_id
    for update;
    if not found then
      raise exception 'proposal not found' using errcode = '42501';
    end if;
    if v_proposal.status <> 'draft' then
      raise exception 'proposal cannot be edited' using errcode = '22023';
    end if;

    perform public.enforce_rate_limit('proposal_draft_save');

    update public.proposals p set
      diagnosis = case when p_data ? 'diagnosis' then pg_catalog.btrim(coalesce(p_data ->> 'diagnosis', '')) else p.diagnosis end,
      solution = case when p_data ? 'solution' then pg_catalog.btrim(coalesce(p_data ->> 'solution', '')) else p.solution end,
      deliverables = case when p_data ? 'deliverables' then pg_catalog.btrim(coalesce(p_data ->> 'deliverables', '')) else p.deliverables end,
      timeline = case when p_data ? 'timeline' then pg_catalog.btrim(coalesce(p_data ->> 'timeline', '')) else p.timeline end,
      price = case when p_data ? 'price' then (p_data ->> 'price')::numeric else p.price end,
      currency = case when p_data ? 'currency' then p_data ->> 'currency' else p.currency end,
      recurring_costs = case when p_data ? 'recurring_costs' then pg_catalog.btrim(coalesce(p_data ->> 'recurring_costs', '')) else p.recurring_costs end,
      maintenance_warranty = case when p_data ? 'maintenance_warranty' then pg_catalog.btrim(coalesce(p_data ->> 'maintenance_warranty', '')) else p.maintenance_warranty end,
      related_experience = case when p_data ? 'related_experience' then pg_catalog.btrim(coalesce(p_data ->> 'related_experience', '')) else p.related_experience end
    where p.id = v_proposal.id;
    return v_proposal.id;
  end if;

  -- Serialize first, so a concurrent creation cannot turn a duplicate into a
  -- misleading quota error. Lock an existing proposal in the usual order so a
  -- concurrent withdrawal can finish before this validation is decided.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rate-limit:' || v_user_id::text || ':proposal_draft_create', 0)
  );
  perform 1 from public.proposals p
  where p.problem_id = p_problem_id and p.freelancer_id = v_user_id and p.status <> 'withdrawn'
  for share;
  if found then
    raise exception 'duplicate key value violates unique constraint "proposals_one_active_per_problem_freelancer_idx"'
      using errcode = '23505', constraint = 'proposals_one_active_per_problem_freelancer_idx';
  end if;
  perform public.enforce_rate_limit('proposal_draft_create');

  insert into public.proposals (
    problem_id, problem_title_snapshot, freelancer_id, diagnosis, solution, deliverables, timeline, price,
    currency, recurring_costs, maintenance_warranty, related_experience
  ) values (
    p_problem_id, v_problem_title, v_user_id, pg_catalog.btrim(coalesce(p_data ->> 'diagnosis', '')),
    pg_catalog.btrim(coalesce(p_data ->> 'solution', '')),
    pg_catalog.btrim(coalesce(p_data ->> 'deliverables', '')),
    pg_catalog.btrim(coalesce(p_data ->> 'timeline', '')),
    (p_data ->> 'price')::numeric, coalesce(p_data ->> 'currency', 'PEN'),
    pg_catalog.btrim(coalesce(p_data ->> 'recurring_costs', '')),
    pg_catalog.btrim(coalesce(p_data ->> 'maintenance_warranty', '')),
    pg_catalog.btrim(coalesce(p_data ->> 'related_experience', ''))
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.submit_proposal(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_freelancer_user();
  v_problem_id uuid;
  v_problem_suspended timestamptz;
  v_proposal public.proposals%rowtype;
begin
  select p.problem_id into v_problem_id from public.proposals p
  where p.id = p_proposal_id and p.freelancer_id = v_user_id;
  if not found then
    raise exception 'proposal not found' using errcode = '42501';
  end if;

  select p.suspended_at into v_problem_suspended from public.business_problems p
  where p.id = v_problem_id and p.status = 'open'::public.business_problem_status
  for share;
  if not found then
    raise exception 'open problem required' using errcode = '22023';
  end if;
  if v_problem_suspended is not null then raise exception 'problem suspended' using errcode = 'P0001'; end if;

  select p.* into v_proposal from public.proposals p
  where p.id = p_proposal_id and p.freelancer_id = v_user_id and p.problem_id = v_problem_id
  for update;
  if not found then
    raise exception 'proposal not found' using errcode = '42501';
  end if;
  if v_proposal.status <> 'draft' then
    raise exception 'invalid proposal status transition' using errcode = '22023';
  end if;
  if v_proposal.diagnosis ~ '^[[:space:]]*$'
     or v_proposal.solution ~ '^[[:space:]]*$'
     or v_proposal.deliverables ~ '^[[:space:]]*$'
     or v_proposal.timeline ~ '^[[:space:]]*$'
     or v_proposal.price is null then
    raise exception 'proposal requires diagnosis, solution, deliverables, timeline and price' using errcode = '22023';
  end if;

  perform public.enforce_rate_limit('proposal_submit');

  update public.proposals p set status = 'submitted', submitted_at = now()
  where p.id = v_proposal.id;
  perform public.set_problem_interaction(v_problem_id, 'proposal_submitted');
  return v_proposal.id;
end;
$$;

create or replace function public.set_problem_interaction(p_problem_id uuid, p_next text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_freelancer_user();
  v_problem_status public.business_problem_status;
  v_problem_suspended timestamptz;
  v_current text;
begin
  if p_next is not null and p_next not in ('saved', 'dismissed', 'proposal_submitted') then
    raise exception 'invalid problem interaction state' using errcode = '22023';
  end if;

  -- Lock the problem first, as submit_proposal does; undo also works when it is not open.
  select p.status, p.suspended_at into v_problem_status, v_problem_suspended from public.business_problems p
  where p.id = p_problem_id
  for share;
  if p_next is not null and v_problem_suspended is not null then
    raise exception 'problem suspended' using errcode = 'P0001';
  end if;
  if p_next is not null and v_problem_status is distinct from 'open'::public.business_problem_status then
    raise exception 'open problem required for interaction' using errcode = '22023';
  end if;

  -- This existing row serializes first interactions too, when there is no interaction row to lock.
  perform 1 from public.app_users u
  where u.id = v_user_id and u.role = 'freelancer'::public.user_role
  for no key update;
  if not found then
    raise exception 'freelancer account required' using errcode = '42501';
  end if;

  select i.state into v_current from public.freelancer_problem_interactions i
  where i.freelancer_id = v_user_id and i.problem_id = p_problem_id
  for update;

  if v_current is null and p_next is not null then
    perform public.enforce_rate_limit('problem_interaction');
    insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state)
    values (v_user_id, p_problem_id, p_next);
    return p_next;
  elsif v_current = 'saved' and p_next = 'proposal_submitted' then
    perform public.enforce_rate_limit('problem_interaction');
    update public.freelancer_problem_interactions i set state = p_next
    where i.freelancer_id = v_user_id and i.problem_id = p_problem_id;
    return p_next;
  elsif v_current in ('saved', 'dismissed') and p_next is null then
    perform public.enforce_rate_limit('problem_interaction');
    delete from public.freelancer_problem_interactions i
    where i.freelancer_id = v_user_id and i.problem_id = p_problem_id;
    return null;
  end if;

  return v_current;
end;
$$;

create or replace function public.set_proposal_interaction(p_proposal_id uuid, p_next text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
  v_problem_id uuid;
  v_problem_status public.business_problem_status;
  v_problem_suspended timestamptz;
  v_proposal public.proposals%rowtype;
  v_current text;
begin
  if p_next is not null and p_next not in ('unseen', 'saved', 'dismissed', 'interested') then
    raise exception 'invalid proposal interaction state' using errcode = '22023';
  end if;

  -- Discover the problem without locking; authorize it before taking locks.
  select p.problem_id into v_problem_id
  from public.proposals p
  join public.business_problems b on b.id = p.problem_id
  where p.id = p_proposal_id and b.company_user_id = v_user_id;
  if not found then
    raise exception 'proposal not found' using errcode = '42501';
  end if;

  -- All proposal mutations lock the problem before the proposal.
  select b.status, b.suspended_at into v_problem_status, v_problem_suspended from public.business_problems b
  where b.id = v_problem_id and b.company_user_id = v_user_id
  for share;
  if not found then
    raise exception 'proposal not found' using errcode = '42501';
  end if;
  if p_next is not null and p_next <> 'unseen' and v_problem_suspended is not null then
    raise exception 'problem suspended' using errcode = 'P0001';
  end if;
  if v_problem_status not in ('open'::public.business_problem_status, 'paused'::public.business_problem_status) then
    raise exception 'open or paused problem required for interaction' using errcode = '22023';
  end if;

  -- This lock also serializes concurrent first interactions and withdrawals.
  select p.* into v_proposal from public.proposals p
  where p.id = p_proposal_id and p.problem_id = v_problem_id
  for update;
  if not found then
    raise exception 'proposal not found' using errcode = '42501';
  end if;
  if v_proposal.status = 'withdrawn' then
    raise exception 'proposal withdrawn' using errcode = '22023';
  end if;
  if v_proposal.status <> 'submitted' then
    raise exception 'submitted proposal required' using errcode = '22023';
  end if;

  select i.state into v_current from public.company_proposal_interactions i
  where i.company_user_id = v_user_id and i.proposal_id = p_proposal_id
  for update;

  if v_current is null and p_next is not null and p_next <> 'unseen' then
    perform public.enforce_rate_limit('company_interaction');
    insert into public.company_proposal_interactions (company_user_id, proposal_id, state)
    values (v_user_id, p_proposal_id, p_next);

    if p_next = 'interested' then
      insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id)
      values (v_problem_id, p_proposal_id, v_user_id, v_proposal.freelancer_id)
      on conflict (proposal_id) do nothing;
    end if;
    return p_next;
  elsif v_current in ('saved', 'dismissed') and p_next is null then
    perform public.enforce_rate_limit('company_interaction');
    delete from public.company_proposal_interactions i
    where i.company_user_id = v_user_id and i.proposal_id = p_proposal_id;
    return null;
  end if;

  return v_current;
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

  perform public.require_active_account();
  perform 1 from public.app_settings s where s.key = 'require_company_verification_to_publish' for share;
  if coalesce((select s.value = 'true'::jsonb from public.app_settings s
      where s.key = 'require_company_verification_to_publish'), false)
    and not exists (select 1 from public.company_verifications v
      where v.company_user_id = v_user_id and v.status = 'verified') then
    raise exception 'company verification required to publish' using errcode = 'P0001';
  end if;
  if v_problem.suspended_at is not null then
    raise exception 'problem suspended' using errcode = 'P0001';
  end if;

  perform public.enforce_rate_limit('problem_publish');

  update public.business_problems p
  set status = 'open'::public.business_problem_status,
      published_at = coalesce(p.published_at, now())
  where p.id = v_problem.id;
  return v_problem.id;
end;
$$;

-- Profile and portfolio tables also have direct, RLS-protected client writes.
-- The trigger checks the requesting role, not the owner executing SECURITY DEFINER RPCs.
create function public.guard_suspended_client_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if pg_catalog.current_setting('role', true) = 'authenticated' then
    perform public.require_active_account();
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.guard_suspended_client_write() from public, anon, authenticated;
create trigger guard_suspended_write before insert or update or delete on public.profiles
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.company_profiles
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.freelancer_profiles
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.freelancer_skills
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.portfolio_projects
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.portfolio_media
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.business_problems
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.proposals
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.freelancer_problem_interactions
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.company_proposal_interactions
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.messages
  for each row execute function public.guard_suspended_client_write();
create trigger guard_suspended_write before insert or update or delete on public.conversation_reads
  for each row execute function public.guard_suspended_client_write();

-- Existing profiles remain readable even if the account is suspended.
create or replace function public.ensure_my_profile()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_profile public.profiles%rowtype;
begin
  if v_user_id is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select p.* into v_profile from public.profiles p where p.id = v_user_id;
  if not found then
    perform public.create_profile_for_app_user(v_user_id);
    select p.* into v_profile from public.profiles p where p.id = v_user_id;
  end if;
  return pg_catalog.to_jsonb(v_profile);
end;
$$;

create or replace function public.get_public_counters()
returns table(open_problems bigint, companies_published bigint, freelancers_active bigint, proposals_submitted bigint)
language sql stable security definer set search_path = ''
as $$
  select
    (select pg_catalog.count(*) from public.business_problems p
      join public.app_users u on u.id = p.company_user_id
      where p.status = 'open' and p.suspended_at is null and u.suspended_at is null),
    (select pg_catalog.count(distinct p.company_user_id) from public.business_problems p
      join public.app_users u on u.id = p.company_user_id
      where p.status in ('open', 'paused', 'closed') and p.suspended_at is null and u.suspended_at is null),
    (select pg_catalog.count(*) from public.profiles p
      join public.freelancer_profiles f on f.user_id = p.id
      join public.app_users u on u.id = p.id
      where p.account_type = 'freelancer' and p.is_public and u.suspended_at is null
        and pg_catalog.btrim(coalesce(f.headline, '')) <> ''),
    (select pg_catalog.count(*) from public.proposals p
      join public.app_users u on u.id = p.freelancer_id
      join public.business_problems b on b.id = p.problem_id
      join public.app_users company on company.id = b.company_user_id
      where p.status = 'submitted' and u.suspended_at is null
        and b.suspended_at is null and company.suspended_at is null);
$$;
revoke all on function public.get_public_counters() from public, anon, authenticated;
grant execute on function public.get_public_counters() to anon, authenticated;

create function public.list_my_proposal_company_trust()
returns table(proposal_id uuid, company_verified boolean)
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := public.require_freelancer_user();
begin
  return query select p.id, coalesce(v.status = 'verified', false)
    from public.proposals p join public.business_problems b on b.id = p.problem_id
    left join public.company_verifications v on v.company_user_id = b.company_user_id
    where p.freelancer_id = v_user_id;
end;
$$;
revoke all on function public.list_my_proposal_company_trust() from public, anon, authenticated;
grant execute on function public.list_my_proposal_company_trust() to authenticated;

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
        'company_verified', coalesce(cv.status = 'verified', false),
        'published_at', p.published_at
      ) order by p.published_at desc
    ), '[]'::jsonb)
    from public.business_problems p
    left join public.company_profiles cp on cp.user_id = p.company_user_id
    left join public.company_verifications cv on cv.company_user_id = p.company_user_id
    where p.status = 'open' and p.suspended_at is null
  );
end;
$$;

drop function public.list_my_matches();
create or replace function public.list_my_matches()
returns table (
  match_id uuid,
  problem_id uuid,
  proposal_id uuid,
  counterpart_name text,
  problem_title text,
  created_at timestamptz,
  counterpart_company_verified boolean
)
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
  if v_role = 'company'::public.user_role then
    perform public.require_company_user();
    return query
      select m.id, m.problem_id, m.proposal_id, profile.display_name, b.title, m.created_at, null::boolean
      from public.matches m
      join public.business_problems b on b.id = m.problem_id
      left join public.profiles profile on profile.id = m.freelancer_id
      where m.company_user_id = v_user_id
      order by m.created_at desc, m.id;
  elsif v_role = 'freelancer'::public.user_role then
    perform public.require_freelancer_user();
    return query
      select m.id, m.problem_id, m.proposal_id,
        case when b.show_company_name then company.company_name else null end,
        b.title, m.created_at, coalesce(cv.status = 'verified', false)
      from public.matches m
      join public.business_problems b on b.id = m.problem_id
      left join public.company_profiles company on company.user_id = m.company_user_id
      left join public.company_verifications cv on cv.company_user_id = m.company_user_id
      where m.freelancer_id = v_user_id
      order by m.created_at desc, m.id;
  else
    raise exception 'account required' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.list_my_matches() from public, anon, authenticated;
grant execute on function public.list_my_matches() to authenticated;

drop function public.list_conversations();
create function public.list_conversations()
returns table (
  match_id uuid,
  problem_title text,
  counterpart_name text,
  counterpart_role text,
  last_message_body text,
  last_message_at timestamptz,
  last_message_sender_is_me boolean,
  unread_count integer,
  counterpart_company_verified boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_chat_user();
begin
  return query
    select m.id, p.problem_title_snapshot,
      case when m.company_user_id = v_user_id then profile.display_name
        when b.show_company_name then company.company_name else null end,
      case when m.company_user_id = v_user_id then 'freelancer'::text else 'company'::text end,
      pg_catalog.left(last_message.body, 140), last_message.created_at,
      case when last_message.id is null then null else last_message.sender_id = v_user_id end,
      (select pg_catalog.count(*)::integer from public.messages unread
       where unread.match_id = m.id and unread.sender_id <> v_user_id
         and (reads.last_read_at is null
           or (unread.created_at, unread.id) > (reads.last_read_at, reads.last_read_message_id))),
      case when m.company_user_id = v_user_id then null::boolean else coalesce(cv.status = 'verified', false) end
    from public.matches m
    join public.proposals p on p.id = m.proposal_id
    join public.business_problems b on b.id = m.problem_id
    left join public.profiles profile on profile.id = m.freelancer_id
    left join public.company_profiles company on company.user_id = m.company_user_id
    left join public.company_verifications cv on cv.company_user_id = m.company_user_id
    left join public.conversation_reads reads on reads.match_id = m.id and reads.user_id = v_user_id
    left join lateral (
      select msg.id, msg.body, msg.created_at, msg.sender_id from public.messages msg
      where msg.match_id = m.id order by msg.created_at desc, msg.id desc limit 1
    ) last_message on true
    where m.company_user_id = v_user_id or m.freelancer_id = v_user_id
    order by coalesce(last_message.created_at, m.created_at) desc, m.id;
end;
$$;
revoke all on function public.list_conversations() from public, anon, authenticated;
grant execute on function public.list_conversations() to authenticated;

-- Direct Storage uploads must respect suspension as well as the existing bucket policies.
create function public.can_write_profile_storage()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.app_users u where u.id = auth.uid() and u.suspended_at is null
  );
$$;
revoke all on function public.can_write_profile_storage() from public, anon, authenticated;
grant execute on function public.can_write_profile_storage() to authenticated;
create policy profile_storage_active_insert on storage.objects as restrictive for insert to authenticated
  with check (bucket_id not in ('avatars', 'portfolio-media') or public.can_write_profile_storage());
create policy profile_storage_active_update on storage.objects as restrictive for update to authenticated
  using (bucket_id not in ('avatars', 'portfolio-media') or public.can_write_profile_storage())
  with check (bucket_id not in ('avatars', 'portfolio-media') or public.can_write_profile_storage());
create policy profile_storage_active_delete on storage.objects as restrictive for delete to authenticated
  using (bucket_id not in ('avatars', 'portfolio-media') or public.can_write_profile_storage());
