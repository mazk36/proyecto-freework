create table public.company_proposal_interactions (
  company_user_id uuid not null references public.app_users (id) on delete cascade,
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  state text not null check (state in ('saved', 'dismissed', 'interested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_user_id, proposal_id)
);

create index company_proposal_interactions_proposal_idx
  on public.company_proposal_interactions (proposal_id);

create table public.matches (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  problem_id uuid not null references public.business_problems (id) on delete restrict,
  proposal_id uuid not null unique references public.proposals (id) on delete restrict,
  company_user_id uuid not null references public.app_users (id) on delete restrict,
  freelancer_id uuid not null references public.app_users (id) on delete restrict,
  status text not null default 'matched' check (status = 'matched'),
  created_at timestamptz not null default now()
);

create index matches_company_created_idx on public.matches (company_user_id, created_at desc);
create index matches_freelancer_created_idx on public.matches (freelancer_id, created_at desc);
create index matches_problem_idx on public.matches (problem_id);

alter table public.company_proposal_interactions enable row level security;
alter table public.matches enable row level security;
revoke all on table public.company_proposal_interactions from public, anon, authenticated;
revoke all on table public.matches from public, anon, authenticated;
grant select on table public.company_proposal_interactions to authenticated;
grant select on table public.matches to authenticated;

create policy company_proposal_interactions_read_own on public.company_proposal_interactions
  for select to authenticated using (
    company_user_id = (select auth.uid())
    and exists (
      select 1 from public.app_users u
      where u.id = (select auth.uid()) and u.role = 'company'::public.user_role
    )
  );

create policy matches_read_participants on public.matches
  for select to authenticated using (
    company_user_id = (select auth.uid()) or freelancer_id = (select auth.uid())
  );

create trigger company_proposal_interactions_updated_at
  before update on public.company_proposal_interactions
  for each row execute function public.set_updated_at();

create or replace function public.list_problem_proposals(p_problem_id uuid)
returns table (
  id uuid,
  problem_id uuid,
  freelancer_id uuid,
  freelancer_name text,
  freelancer_slug text,
  headline text,
  diagnosis text,
  solution text,
  deliverables text,
  timeline text,
  price numeric,
  currency text,
  recurring_costs text,
  maintenance_warranty text,
  related_experience text,
  submitted_at timestamptz,
  my_state text,
  match_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_company_user();
begin
  if not exists (
    select 1 from public.business_problems b
    where b.id = p_problem_id and b.company_user_id = v_user_id
  ) then
    raise exception 'problem not found' using errcode = '42501';
  end if;

  return query
    select p.id, p.problem_id, p.freelancer_id, profile.display_name,
      case when profile.is_public then profile.slug else null end,
      case when profile.is_public then freelancer.headline else null end,
      p.diagnosis, p.solution, p.deliverables, p.timeline, p.price, p.currency,
      p.recurring_costs, p.maintenance_warranty, p.related_experience,
      p.submitted_at, i.state, m.id
    from public.proposals p
    left join public.profiles profile on profile.id = p.freelancer_id
    left join public.freelancer_profiles freelancer on freelancer.user_id = p.freelancer_id
    left join public.company_proposal_interactions i
      on i.company_user_id = v_user_id and i.proposal_id = p.id
    left join public.matches m on m.proposal_id = p.id and m.company_user_id = v_user_id
    where p.problem_id = p_problem_id and p.status = 'submitted'
    order by p.submitted_at asc, p.id;
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
    insert into public.company_proposal_interactions (company_user_id, proposal_id, state)
    values (v_user_id, p_proposal_id, p_next);

    if p_next = 'interested' then
      insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id)
      values (v_problem_id, p_proposal_id, v_user_id, v_proposal.freelancer_id)
      on conflict (proposal_id) do nothing;
    end if;
    return p_next;
  elsif v_current in ('saved', 'dismissed') and p_next is null then
    delete from public.company_proposal_interactions i
    where i.company_user_id = v_user_id and i.proposal_id = p_proposal_id;
    return null;
  end if;

  return v_current;
end;
$$;

create or replace function public.list_my_matches()
returns table (
  match_id uuid,
  problem_id uuid,
  proposal_id uuid,
  counterpart_name text,
  problem_title text,
  created_at timestamptz
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
      select m.id, m.problem_id, m.proposal_id, profile.display_name, b.title, m.created_at
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
        b.title, m.created_at
      from public.matches m
      join public.business_problems b on b.id = m.problem_id
      left join public.company_profiles company on company.user_id = m.company_user_id
      where m.freelancer_id = v_user_id
      order by m.created_at desc, m.id;
  else
    raise exception 'account required' using errcode = '42501';
  end if;
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

  update public.proposals p set status = 'withdrawn'
  where p.id = v_proposal.id;
  return v_proposal.id;
end;
$$;

revoke all on function public.list_problem_proposals(uuid) from public, anon, authenticated;
revoke all on function public.set_proposal_interaction(uuid, text) from public, anon, authenticated;
revoke all on function public.list_my_matches() from public, anon, authenticated;
revoke all on function public.withdraw_proposal(uuid) from public, anon, authenticated;
grant execute on function public.list_problem_proposals(uuid) to authenticated;
grant execute on function public.set_proposal_interaction(uuid, text) to authenticated;
grant execute on function public.list_my_matches() to authenticated;
grant execute on function public.withdraw_proposal(uuid) to authenticated;

comment on table public.company_proposal_interactions is
  'Private company interactions; the absence of a row means unseen and client writes use RPCs.';
comment on table public.matches is
  'Mutual interest to continue a conversation; visible only to the participating company and freelancer.';
