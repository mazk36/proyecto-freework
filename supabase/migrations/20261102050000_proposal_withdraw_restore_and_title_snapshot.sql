-- Preserve the title available to the author when a proposal is created.
alter table public.proposals add column problem_title_snapshot text;

-- Backfilling a technical snapshot must not make historical drafts appear edited.
do $$
begin
  alter table public.proposals disable trigger proposals_updated_at;
  update public.proposals p set problem_title_snapshot = b.title
  from public.business_problems b where b.id = p.problem_id;
  alter table public.proposals enable trigger proposals_updated_at;
end;
$$;

alter table public.proposals
  alter column problem_title_snapshot set not null,
  add constraint proposals_problem_title_snapshot_length_check
    check (pg_catalog.char_length(problem_title_snapshot) <= 200);

create or replace function public.prevent_proposal_title_snapshot_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.problem_title_snapshot is distinct from old.problem_title_snapshot then
    raise exception 'proposal problem title snapshot cannot be changed' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_proposal_title_snapshot_change() from public, anon, authenticated;

create trigger proposals_prevent_title_snapshot_change
  before update on public.proposals
  for each row execute function public.prevent_proposal_title_snapshot_change();

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

