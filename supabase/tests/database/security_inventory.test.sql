begin;

select plan(9);

-- Invariantes estructurales: fallan si aparece algo nuevo sin protección.
select is(
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), '')
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  '', 'todas las tablas de public tienen RLS activado');

select is(
  (select coalesce(string_agg(p.proname, ', ' order by p.proname), '')
   from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prosecdef
     and not exists (select 1 from pg_options_to_table(p.proconfig) o where o.option_name = 'search_path' and o.option_value in ('', '""'))),
  '', 'toda función SECURITY DEFINER fija search_path vacío');

select is(
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), '')
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and not coalesce((select o = 'security_invoker=true' from unnest(c.reloptions) o where o = 'security_invoker=true'), false)),
  '', 'toda vista de public usa security_invoker');

select is(
  (select coalesce(string_agg(p.proname, ', ' order by p.proname), '')
   from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')),
  '', 'ninguna función de public es ejecutable por PUBLIC');

select is(
  (select coalesce(string_agg(p.proname, ', ' order by p.proname), '')
   from pg_proc p
   where p.pronamespace = 'public'::regnamespace and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
     and p.proname <> 'get_public_counters'),
  '', 'anon solo ejecuta get_public_counters');

select is(
  (select coalesce(string_agg(table_name || '.' || privilege_type, ', ' order by table_name, privilege_type), '')
   from information_schema.table_privileges
   where table_schema = 'public' and grantee = 'anon' and privilege_type <> 'SELECT'),
  '', 'anon no tiene privilegios de escritura en tablas');

select is(
  (select coalesce(string_agg(table_name, ', ' order by table_name), '')
   from information_schema.table_privileges
   where table_schema = 'public' and grantee in ('anon', 'authenticated')
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
     and table_name not in ('freelancer_profiles', 'freelancer_skills', 'portfolio_projects', 'portfolio_media')
     and table_name not in (select table_name from information_schema.column_privileges where false)),
  '', 'solo las tablas de perfil admiten escrituras directas (el resto va por RPC)');

-- Cuotas en las escrituras directas del perfil.
insert into auth.users (id, instance_id, email, raw_user_meta_data, aud, role)
values ('1c000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'quota@example.test', '{"role":"freelancer"}', 'authenticated', 'authenticated');
select set_config('request.jwt.claims', '{"sub":"1c000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.freelancer_skills (freelancer_user_id, custom_name)
select '1c000000-0000-4000-8000-000000000001', 'Habilidad ' || g from generate_series(1, 50) g;
select throws_ok(
  $$insert into public.freelancer_skills (freelancer_user_id, custom_name) values ('1c000000-0000-4000-8000-000000000001', 'Una más')$$,
  '54000', null, 'más de 50 habilidades por freelancer se rechazan');
insert into public.portfolio_projects (freelancer_user_id, title)
select '1c000000-0000-4000-8000-000000000001', 'Proyecto ' || g from generate_series(1, 50) g;
select throws_ok(
  $$insert into public.portfolio_projects (freelancer_user_id, title) values ('1c000000-0000-4000-8000-000000000001', 'Otro')$$,
  '54000', null, 'más de 50 proyectos de portafolio por freelancer se rechazan');
reset role;

select * from finish();
rollback;
