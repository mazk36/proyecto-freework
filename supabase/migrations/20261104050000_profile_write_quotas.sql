-- Las tablas del perfil admiten INSERT/UPDATE directos por PostgREST (RLS por propietario),
-- así que no pasaban por las cuotas de las RPC. Se añade un tope de filas por usuario y una
-- cuota de escrituras por hora que solo aplica a clientes (rol authenticated).

insert into public.rate_limit_policies (action, max_events, window_seconds, description)
values ('profile_write', 600, 3600, 'Escrituras directas del perfil y el portafolio')
on conflict (action) do nothing;

create or replace function public.guard_profile_write_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if pg_catalog.current_setting('role', true) <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if tg_table_name = 'portfolio_projects' then
      select pg_catalog.count(*) into v_count from public.portfolio_projects p where p.freelancer_user_id = new.freelancer_user_id;
      if v_count >= 50 then
        raise exception 'portfolio project limit reached' using errcode = '54000', hint = 'Máximo 50 proyectos de portafolio.';
      end if;
    elsif tg_table_name = 'freelancer_skills' then
      select pg_catalog.count(*) into v_count from public.freelancer_skills s where s.freelancer_user_id = new.freelancer_user_id;
      if v_count >= 50 then
        raise exception 'skill limit reached' using errcode = '54000', hint = 'Máximo 50 habilidades.';
      end if;
    elsif tg_table_name = 'portfolio_media' then
      select pg_catalog.count(*) into v_count from public.portfolio_media m where m.project_id = new.project_id;
      if v_count >= 20 then
        raise exception 'portfolio media limit reached' using errcode = '54000', hint = 'Máximo 20 archivos por proyecto.';
      end if;
    end if;
  end if;

  perform public.enforce_rate_limit('profile_write');
  return new;
end;
$$;

revoke all on function public.guard_profile_write_quota() from public, anon, authenticated;

create trigger guard_profile_write_quota before insert or update on public.freelancer_profiles
  for each row execute function public.guard_profile_write_quota();
create trigger guard_profile_write_quota before insert or update on public.freelancer_skills
  for each row execute function public.guard_profile_write_quota();
create trigger guard_profile_write_quota before insert or update on public.portfolio_projects
  for each row execute function public.guard_profile_write_quota();
create trigger guard_profile_write_quota before insert or update on public.portfolio_media
  for each row execute function public.guard_profile_write_quota();
