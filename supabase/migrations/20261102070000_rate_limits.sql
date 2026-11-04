-- Private, adjustable policies and transactional accounting for application RPCs.
create table public.rate_limit_policies (
  action text primary key,
  max_events integer not null check (max_events > 0),
  window_seconds integer not null check (window_seconds > 0),
  description text not null
);

create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.app_users (id) on delete cascade,
  action text not null,
  scope uuid,
  created_at timestamptz not null default now()
);

create index rate_limit_events_user_action_created_idx
  on public.rate_limit_events (user_id, action, created_at desc);
create index rate_limit_events_scoped_idx
  on public.rate_limit_events (user_id, action, scope, created_at desc)
  where scope is not null;
create index rate_limit_events_user_created_idx
  on public.rate_limit_events (user_id, created_at, id);

alter table public.rate_limit_policies enable row level security;
alter table public.rate_limit_events enable row level security;
revoke all on table public.rate_limit_policies from public, anon, authenticated;
revoke all on table public.rate_limit_events from public, anon, authenticated;
revoke all on sequence public.rate_limit_events_id_seq from public, anon, authenticated;

insert into public.rate_limit_policies (action, max_events, window_seconds, description) values
  ('proposal_draft_create', 20, 3600, 'Create proposal drafts'),
  ('proposal_draft_save', 200, 3600, 'Save existing proposal drafts'),
  ('proposal_submit', 20, 3600, 'Submit proposals'),
  ('proposal_withdraw', 20, 3600, 'Withdraw proposals'),
  ('problem_interaction', 600, 3600, 'Change freelancer problem interactions'),
  ('company_interaction', 300, 3600, 'Change company proposal interactions'),
  ('problem_draft_create', 20, 86400, 'Create business problem drafts'),
  ('problem_draft_save', 300, 3600, 'Save existing business problem drafts'),
  ('problem_publish', 20, 86400, 'Publish business problems'),
  ('chat_send', 30, 60, 'Send messages per conversation')
on conflict (action) do nothing;

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
  insert into public.rate_limit_events (user_id, action, scope, created_at)
  values (v_user_id, p_action, p_scope, v_now);
end;
$$;

revoke all on function public.enforce_rate_limit(text, uuid) from public, anon, authenticated;

-- Preserve the previous chat quota for messages sent just before this migration.
-- Apply during a short write pause so in-flight sends cannot straddle the cutover.
insert into public.rate_limit_events (user_id, action, scope, created_at)
select m.sender_id, 'chat_send', m.match_id, m.created_at
from public.messages m
where m.created_at >= pg_catalog.clock_timestamp() - interval '1 minute';


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
  select p.title into v_problem_title from public.business_problems p
  where p.id = p_problem_id and p.status = 'open'::public.business_problem_status
  for share;
  if not found then
    raise exception 'open problem required' using errcode = '22023';
  end if;

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
  v_proposal public.proposals%rowtype;
begin
  select p.problem_id into v_problem_id from public.proposals p
  where p.id = p_proposal_id and p.freelancer_id = v_user_id;
  if not found then
    raise exception 'proposal not found' using errcode = '42501';
  end if;

  perform 1 from public.business_problems p
  where p.id = v_problem_id and p.status = 'open'::public.business_problem_status
  for share;
  if not found then
    raise exception 'open problem required' using errcode = '22023';
  end if;

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

create or replace function public.withdraw_proposal(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_freelancer_user();
  v_problem_id uuid;
  v_proposal public.proposals%rowtype;
begin
  select p.problem_id into v_problem_id from public.proposals p
  where p.id = p_proposal_id and p.freelancer_id = v_user_id;
  if not found then
    raise exception 'proposal not found' using errcode = '42501';
  end if;

  -- The author may withdraw when the problem is paused or closed; lock it first.
  perform 1 from public.business_problems p where p.id = v_problem_id for share;

  select p.* into v_proposal from public.proposals p
  where p.id = p_proposal_id and p.freelancer_id = v_user_id and p.problem_id = v_problem_id
  for update;
  if not found then
    raise exception 'proposal not found' using errcode = '42501';
  end if;
  if exists (select 1 from public.matches m where m.proposal_id = v_proposal.id) then
    raise exception 'proposal already matched' using errcode = '22023';
  end if;
  if v_proposal.status not in ('draft', 'submitted') then
    raise exception 'invalid proposal status transition' using errcode = '22023';
  end if;

  -- Serialize with interaction changes and submissions, including first interactions.
  perform 1 from public.app_users u
  where u.id = v_user_id and u.role = 'freelancer'::public.user_role
  for no key update;
  if not found then
    raise exception 'freelancer account required' using errcode = '42501';
  end if;

  perform public.enforce_rate_limit('proposal_withdraw');

  update public.proposals p set status = 'withdrawn'
  where p.id = v_proposal.id;

  update public.freelancer_problem_interactions i set state = 'saved'
  where i.freelancer_id = v_user_id and i.problem_id = v_problem_id
    and i.state = 'proposal_submitted'
    and not exists (
      select 1 from public.proposals p
      where p.problem_id = v_problem_id and p.freelancer_id = v_user_id
        and p.id <> v_proposal.id and p.status <> 'withdrawn'
    );
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
  v_current text;
begin
  if p_next is not null and p_next not in ('saved', 'dismissed', 'proposal_submitted') then
    raise exception 'invalid problem interaction state' using errcode = '22023';
  end if;

  -- Lock the problem first, as submit_proposal does; undo also works when it is not open.
  select p.status into v_problem_status from public.business_problems p
  where p.id = p_problem_id
  for share;
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
  select b.status into v_problem_status from public.business_problems b
  where b.id = v_problem_id and b.company_user_id = v_user_id
  for share;
  if not found then
    raise exception 'proposal not found' using errcode = '42501';
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
  v_current_step integer;
  v_show_company_name boolean;
  v_reviewed_and_consented boolean;
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

  -- Concurrent requests for the same client-generated ID must agree whether
  -- this is the first save or an edit before choosing an action.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('problem-draft:' || v_id::text, 0)
  );
  select p.status into v_current_status
  from public.business_problems p
  where p.id = v_id and p.company_user_id = v_user_id
  for update;

  if v_current_status is null and exists (select 1 from public.business_problems p where p.id = v_id) then
    raise exception 'problem not found' using errcode = '42501';
  elsif v_current_status is not null and v_current_status <> 'draft'::public.business_problem_status then
    raise exception 'problem cannot be edited' using errcode = '42501';
  end if;

  -- These casts and the step check were previously evaluated by the INSERT.
  -- Validate them before quota enforcement so invalid input keeps priority.
  v_current_step := coalesce(nullif(p_data ->> 'current_step', '')::integer, 1);
  v_show_company_name := coalesce((p_data ->> 'show_company_name')::boolean, false);
  v_reviewed_and_consented := coalesce((p_data ->> 'reviewed_and_consented')::boolean, false);
  if v_current_step not between 1 and 5 then
    raise exception 'new row for relation "business_problems" violates check constraint "business_problems_current_step_check"'
      using errcode = '23514', constraint = 'business_problems_current_step_check',
        table = 'business_problems', schema = 'public';
  end if;
  if v_current_status is null then
    perform public.enforce_rate_limit('problem_draft_create');
  else
    perform public.enforce_rate_limit('problem_draft_save');
  end if;

  insert into public.business_problems (
    id, company_user_id, status, current_step, title, description, impacts, industry_snapshot,
    locations_count, people_affected, current_process, current_tools, special_conditions,
    objectives, success_criteria, budget_choice, currency, deadline_choice,
    show_company_name, reviewed_and_consented
  ) values (
    v_id, v_user_id, 'draft', v_current_step, v_title, v_description, v_impacts, v_industry,
    v_locations, v_people, pg_catalog.btrim(coalesce(p_data ->> 'current_process', '')),
    pg_catalog.btrim(coalesce(p_data ->> 'current_tools', '')),
    pg_catalog.btrim(coalesce(p_data ->> 'special_conditions', '')),
    v_objectives, pg_catalog.btrim(coalesce(p_data ->> 'success_criteria', '')),
    v_budget_choice, v_currency, v_deadline_choice,
    v_show_company_name, v_reviewed_and_consented
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

  perform public.enforce_rate_limit('problem_publish');

  update public.business_problems p
  set status = 'open'::public.business_problem_status,
      published_at = coalesce(p.published_at, now())
  where p.id = v_problem.id;
  return v_problem.id;
end;
$$;

create or replace function public.send_message(p_match_id uuid, p_body text, p_client_id uuid default null)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_chat_match(p_match_id, true);
  v_message public.messages%rowtype;
  v_body text;
  v_created_at timestamptz;
  v_hint text;
  v_chat_policy public.rate_limit_policies%rowtype;
begin
  -- Locking the match serializes retries, quota checks, message order and read markers.
  if p_client_id is not null then
    select msg.* into v_message from public.messages msg
    where msg.match_id = p_match_id and msg.sender_id = v_user_id and msg.client_id = p_client_id;
    if found then
      return v_message;
    end if;
  end if;

  v_body := pg_catalog.regexp_replace(p_body, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if v_body is null or pg_catalog.char_length(v_body) = 0 then
    raise exception 'message body empty' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_body) > 2000 then
    raise exception 'message body too long' using errcode = '22023';
  end if;
  begin
    perform public.enforce_rate_limit('chat_send', p_match_id);
  exception when sqlstate '54000' then
    -- Keep the established default chat error contract and retry hint. If the
    -- policy is customized, propagate the generic error without a stale limit.
    get stacked diagnostics v_hint = pg_exception_hint;
    select p.* into v_chat_policy from public.rate_limit_policies p where p.action = 'chat_send';
    if v_chat_policy.max_events = 30 and v_chat_policy.window_seconds = 60 then
      raise exception 'message rate limit: maximum 30 messages per minute'
        using errcode = 'P0001', hint = v_hint;
    end if;
    raise;
  end;

  -- A strictly increasing timestamp makes the timestamp-only backwards cursor safe
  -- even when two application sends arrive within the same clock tick.
  select greatest(pg_catalog.clock_timestamp(), coalesce(max(msg.created_at) + interval '1 microsecond', pg_catalog.clock_timestamp()))
    into v_created_at from public.messages msg where msg.match_id = p_match_id;
  insert into public.messages (match_id, sender_id, body, client_id, created_at)
  values (p_match_id, v_user_id, v_body, p_client_id, v_created_at)
  returning * into v_message;
  return v_message;
end;
$$;

-- CREATE OR REPLACE keeps privileges, but restate the client contract explicitly.
revoke all on function public.save_proposal_draft(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.submit_proposal(uuid) from public, anon, authenticated;
revoke all on function public.withdraw_proposal(uuid) from public, anon, authenticated;
revoke all on function public.set_problem_interaction(uuid, text) from public, anon, authenticated;
revoke all on function public.set_proposal_interaction(uuid, text) from public, anon, authenticated;
revoke all on function public.save_business_problem_draft(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.publish_business_problem(uuid) from public, anon, authenticated;
revoke all on function public.send_message(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.save_proposal_draft(uuid, jsonb) to authenticated;
grant execute on function public.submit_proposal(uuid) to authenticated;
grant execute on function public.withdraw_proposal(uuid) to authenticated;
grant execute on function public.set_problem_interaction(uuid, text) to authenticated;
grant execute on function public.set_proposal_interaction(uuid, text) to authenticated;
grant execute on function public.save_business_problem_draft(uuid, jsonb) to authenticated;
grant execute on function public.publish_business_problem(uuid) to authenticated;
grant execute on function public.send_message(uuid, text, uuid) to authenticated;
