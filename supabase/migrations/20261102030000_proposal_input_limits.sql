alter table public.proposals
  add constraint proposals_diagnosis_length_check check (pg_catalog.char_length(diagnosis) <= 5000),
  add constraint proposals_solution_length_check check (pg_catalog.char_length(solution) <= 5000),
  add constraint proposals_deliverables_length_check check (pg_catalog.char_length(deliverables) <= 5000),
  add constraint proposals_timeline_length_check check (pg_catalog.char_length(timeline) <= 300),
  add constraint proposals_recurring_costs_length_check check (pg_catalog.char_length(recurring_costs) <= 2000),
  add constraint proposals_maintenance_warranty_length_check check (pg_catalog.char_length(maintenance_warranty) <= 2000),
  add constraint proposals_related_experience_length_check check (pg_catalog.char_length(related_experience) <= 2000);

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
