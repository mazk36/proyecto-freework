-- Prueba de volumen (10 000 problemas abiertos): list_open_business_problems devolvía TODOS (9,3 MB y ~150 ms).
-- Se añaden dos funciones paginadas por cursor y un índice para ese orden; la antigua queda acotada a los 200 más recientes.

create index if not exists business_problems_open_feed_idx
  on public.business_problems (published_at desc, id desc)
  where status = 'open' and suspended_at is null;

-- Borrar o cerrar un problema comprueba la clave foránea de las interacciones: sin este índice recorre las 490 000 filas.
create index if not exists freelancer_problem_interactions_problem_idx
  on public.freelancer_problem_interactions (problem_id);

create or replace function public.list_open_problems_page(
  p_limit integer default 40,
  p_before_published_at timestamptz default null,
  p_before_id uuid default null,
  p_exclude_interacted boolean default true
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.user_role;
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 100);
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select u.role into v_role from public.app_users u where u.id = v_user_id;
  if v_role is distinct from 'freelancer'::public.user_role then
    raise exception 'freelancer account required' using errcode = '42501';
  end if;
  if (p_before_published_at is null) <> (p_before_id is null) then
    raise exception 'invalid cursor' using errcode = '22023';
  end if;

  return (
    select coalesce(pg_catalog.jsonb_agg(row_json order by published_at desc, id desc), '[]'::jsonb)
    from (
      select p.id, p.published_at,
        pg_catalog.jsonb_build_object(
          'id', p.id, 'title', p.title, 'description', p.description, 'impacts', p.impacts,
          'industry_snapshot', p.industry_snapshot, 'objectives', p.objectives, 'success_criteria', p.success_criteria,
          'budget_choice', p.budget_choice, 'currency', p.currency, 'deadline_choice', p.deadline_choice,
          'show_company_name', p.show_company_name,
          'company_name', case when p.show_company_name then cp.company_name else null end,
          'company_verified', coalesce(cv.status = 'verified', false),
          'published_at', p.published_at
        ) as row_json
      from public.business_problems p
      left join public.company_profiles cp on cp.user_id = p.company_user_id
      left join public.company_verifications cv on cv.company_user_id = p.company_user_id
      where p.status = 'open' and p.suspended_at is null
        and (p_before_published_at is null or (p.published_at, p.id) < (p_before_published_at, p_before_id))
        and (not coalesce(p_exclude_interacted, true) or not exists (
          select 1 from public.freelancer_problem_interactions i where i.freelancer_id = v_user_id and i.problem_id = p.id))
      order by p.published_at desc, p.id desc
      limit v_limit
    ) page
  );
end;
$$;

create or replace function public.list_open_problems_by_ids(p_ids uuid[])
returns jsonb
language plpgsql
stable
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
  if p_ids is null or pg_catalog.cardinality(p_ids) > 100 then
    raise exception 'invalid ids' using errcode = '22023';
  end if;

  return (
    select coalesce(pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', p.id, 'title', p.title, 'description', p.description, 'impacts', p.impacts,
        'industry_snapshot', p.industry_snapshot, 'objectives', p.objectives, 'success_criteria', p.success_criteria,
        'budget_choice', p.budget_choice, 'currency', p.currency, 'deadline_choice', p.deadline_choice,
        'show_company_name', p.show_company_name,
        'company_name', case when p.show_company_name then cp.company_name else null end,
        'company_verified', coalesce(cv.status = 'verified', false),
        'published_at', p.published_at
      ) order by p.published_at desc, p.id desc
    ), '[]'::jsonb)
    from public.business_problems p
    left join public.company_profiles cp on cp.user_id = p.company_user_id
    left join public.company_verifications cv on cv.company_user_id = p.company_user_id
    where p.id = any (p_ids) and p.status = 'open' and p.suspended_at is null
  );
end;
$$;

-- La función antigua se acota a los 200 problemas más recientes mientras no quede ningún cliente que la use.
create or replace function public.list_open_business_problems()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public.list_open_problems_page(200, null, null, false);
end;
$$;

revoke all on function public.list_open_problems_page(integer, timestamptz, uuid, boolean) from public, anon;
revoke all on function public.list_open_problems_by_ids(uuid[]) from public, anon;
grant execute on function public.list_open_problems_page(integer, timestamptz, uuid, boolean) to authenticated;
grant execute on function public.list_open_problems_by_ids(uuid[]) to authenticated;
