create table public.freelancer_problem_interactions (
  freelancer_id uuid not null references public.app_users (id) on delete cascade,
  problem_id uuid not null references public.business_problems (id) on delete cascade,
  state text not null check (state in ('saved', 'dismissed', 'proposal_submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (freelancer_id, problem_id)
);

alter table public.freelancer_problem_interactions enable row level security;
revoke all on table public.freelancer_problem_interactions from public, anon, authenticated;
grant select on table public.freelancer_problem_interactions to authenticated;

create policy freelancer_problem_interactions_read_own on public.freelancer_problem_interactions
  for select to authenticated using (
    freelancer_id = (select auth.uid())
    and exists (
      select 1 from public.app_users u
      where u.id = (select auth.uid()) and u.role = 'freelancer'::public.user_role
    )
  );

create trigger freelancer_problem_interactions_updated_at
  before update on public.freelancer_problem_interactions
  for each row execute function public.set_updated_at();

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
    insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state)
    values (v_user_id, p_problem_id, p_next);
    return p_next;
  elsif v_current = 'saved' and p_next = 'proposal_submitted' then
    update public.freelancer_problem_interactions i set state = p_next
    where i.freelancer_id = v_user_id and i.problem_id = p_problem_id;
    return p_next;
  elsif v_current in ('saved', 'dismissed') and p_next is null then
    delete from public.freelancer_problem_interactions i
    where i.freelancer_id = v_user_id and i.problem_id = p_problem_id;
    return null;
  end if;

  return v_current;
end;
$$;

create or replace function public.list_my_problem_interactions()
returns table (problem_id uuid, state text, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.require_freelancer_user();
begin
  return query
    select i.problem_id, i.state, i.updated_at
    from public.freelancer_problem_interactions i
    where i.freelancer_id = v_user_id
    order by i.updated_at desc, i.problem_id;
end;
$$;

revoke all on function public.set_problem_interaction(uuid, text) from public, anon, authenticated;
revoke all on function public.list_my_problem_interactions() from public, anon, authenticated;
grant execute on function public.set_problem_interaction(uuid, text) to authenticated;
grant execute on function public.list_my_problem_interactions() to authenticated;

comment on table public.freelancer_problem_interactions is
  'Private freelancer interactions; the absence of a row means unseen and client writes use RPCs.';

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
  perform public.set_problem_interaction(v_problem_id, 'proposal_submitted');
  return v_proposal.id;
end;
$$;

revoke all on function public.submit_proposal(uuid) from public, anon, authenticated;
grant execute on function public.submit_proposal(uuid) to authenticated;

