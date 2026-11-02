create table public.proposals (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  problem_id uuid not null references public.business_problems (id) on delete restrict,
  freelancer_id uuid not null references public.app_users (id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'withdrawn')),
  diagnosis text not null default '',
  solution text not null default '',
  deliverables text not null default '',
  -- Free text accommodates different schedules without imposing unapproved units or milestones.
  timeline text not null default '',
  price numeric(12,2) check (price >= 0 and price <> 'NaN'::numeric),
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  recurring_costs text not null default '',
  maintenance_warranty text not null default '',
  related_experience text not null default '',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposals_submitted_at_check check (
    (status <> 'submitted' or submitted_at is not null)
    and (status <> 'draft' or submitted_at is null)
  )
);

create unique index proposals_one_active_per_problem_freelancer_idx
  on public.proposals (problem_id, freelancer_id)
  where status <> 'withdrawn';
create index proposals_freelancer_created_idx
  on public.proposals (freelancer_id, created_at desc);
create index proposals_problem_submitted_idx
  on public.proposals (problem_id, submitted_at desc)
  where status = 'submitted';

alter table public.proposals enable row level security;
revoke all on table public.proposals from public, anon, authenticated;
grant select on table public.proposals to authenticated;

create trigger proposals_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

create or replace function public.require_freelancer_user()
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
    where u.id = v_user_id and u.role = 'freelancer'::public.user_role
  ) then
    raise exception 'freelancer account required' using errcode = '42501';
  end if;
  return v_user_id;
end;
$$;

-- The problem table is not directly accessible to authenticated clients.
create or replace function public.is_proposal_problem_owner(p_problem_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_problems p
    join public.app_users u on u.id = p.company_user_id
    where p.id = p_problem_id
      and u.id = auth.uid()
      and u.role = 'company'::public.user_role
  )
$$;

revoke all on function public.require_freelancer_user() from public, anon, authenticated;
revoke all on function public.is_proposal_problem_owner(uuid) from public, anon, authenticated;
grant execute on function public.is_proposal_problem_owner(uuid) to authenticated;

create policy proposals_read_author on public.proposals
  for select to authenticated using (freelancer_id = (select auth.uid()));

create policy proposals_read_company_submitted on public.proposals
  for select to authenticated using (
    status = 'submitted' and public.is_proposal_problem_owner(problem_id)
  );

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
  if p_data ? 'price' and (p_data ->> 'price')::numeric < 0 then
    raise exception 'invalid proposal price' using errcode = '22023';
  end if;

  -- A shared row lock keeps the problem open until this transaction finishes.
  perform 1 from public.business_problems p
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

  insert into public.proposals (
    problem_id, freelancer_id, diagnosis, solution, deliverables, timeline, price,
    currency, recurring_costs, maintenance_warranty, related_experience
  ) values (
    p_problem_id, v_user_id, pg_catalog.btrim(coalesce(p_data ->> 'diagnosis', '')),
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

  update public.proposals p set status = 'submitted', submitted_at = now()
  where p.id = v_proposal.id;
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
  if v_proposal.status not in ('draft', 'submitted') then
    raise exception 'invalid proposal status transition' using errcode = '22023';
  end if;

  update public.proposals p set status = 'withdrawn'
  where p.id = v_proposal.id;
  return v_proposal.id;
end;
$$;

revoke all on function public.save_proposal_draft(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.submit_proposal(uuid) from public, anon, authenticated;
revoke all on function public.withdraw_proposal(uuid) from public, anon, authenticated;
grant execute on function public.save_proposal_draft(uuid, jsonb) to authenticated;
grant execute on function public.submit_proposal(uuid) to authenticated;
grant execute on function public.withdraw_proposal(uuid) to authenticated;

comment on table public.proposals is
  'Private proposals: authors read their own; problem owners read submitted proposals; client writes use RPCs.';
