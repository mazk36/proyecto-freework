begin;

select plan(14);

insert into auth.users (id, instance_id, email, raw_user_meta_data, aud, role) values
  ('7a000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'page-freelancer@example.test', '{"role":"freelancer"}', 'authenticated', 'authenticated'),
  ('7a000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'page-company@example.test', '{"role":"company"}', 'authenticated', 'authenticated');
insert into public.company_profiles (user_id, company_name, industry) values ('7a000000-0000-4000-8000-000000000002', 'Empresa Paginada', 'Servicios');

-- 5 problemas abiertos con fechas distintas y uno cerrado.
insert into public.business_problems (id, company_user_id, status, title, description, published_at, show_company_name)
select ('7b000000-0000-4000-8000-00000000000' || g)::uuid, '7a000000-0000-4000-8000-000000000002',
       case when g = 6 then 'closed' else 'open' end::public.business_problem_status,
       'Problema ' || g, 'Descripción', now() - (g * interval '1 hour'), true
from generate_series(1, 6) g;
-- El freelancer ya descartó el problema 1 y guardó el 2.
insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state) values
  ('7a000000-0000-4000-8000-000000000001', '7b000000-0000-4000-8000-000000000001', 'dismissed'),
  ('7a000000-0000-4000-8000-000000000001', '7b000000-0000-4000-8000-000000000002', 'saved');

select set_config('request.jwt.claims', '{"sub":"7a000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is(jsonb_array_length(public.list_open_problems_page()), 3, 'la página por defecto excluye los problemas ya decididos y los cerrados');
select is(public.list_open_problems_page(2)->0->>'title', 'Problema 3', 'se ordena del más reciente al más antiguo');
select is(jsonb_array_length(public.list_open_problems_page(2)), 2, 'el límite se respeta');
select is(
  (select jsonb_agg(x->>'title') from jsonb_array_elements(public.list_open_problems_page(
    2, (public.list_open_problems_page(2)->1->>'published_at')::timestamptz, (public.list_open_problems_page(2)->1->>'id')::uuid)) x),
  '["Problema 5"]'::jsonb, 'el cursor continúa después del último problema de la página anterior sin repetir');
select is(jsonb_array_length(public.list_open_problems_page(10, null, null, false)), 5, 'con p_exclude_interacted en falso incluye los ya decididos (Explorar)');
select is(jsonb_array_length(public.list_open_problems_page(1000, null, null, false)), 5, 'el límite máximo no permite pedir más de lo existente');
select throws_ok($$select public.list_open_problems_page(10, now(), null)$$, '22023', null, 'un cursor incompleto se rechaza');
select is(jsonb_array_length(public.list_open_problems_by_ids(array['7b000000-0000-4000-8000-000000000001', '7b000000-0000-4000-8000-000000000006', '7b000000-0000-4000-8000-000000000003']::uuid[])), 2, 'por identificadores solo devuelve los problemas abiertos');
select throws_ok($$select public.list_open_problems_by_ids((select array_agg(gen_random_uuid()) from generate_series(1, 101)))$$, '22023', null, 'más de 100 identificadores se rechaza');
select is(jsonb_array_length(public.list_open_business_problems()), 5, 'la función antigua sigue devolviendo los abiertos (acotada a 200)');
reset role;

select set_config('request.jwt.claims', '{"sub":"7a000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.list_open_problems_page()$$, '42501', null, 'una empresa no puede usar el listado de freelancers');
select throws_ok($$select public.list_open_problems_by_ids(array[]::uuid[])$$, '42501', null, 'una empresa no puede pedir problemas por identificador');
reset role;

set local role anon;
select throws_ok($$select public.list_open_problems_page()$$, '42501', null, 'anon no puede listar problemas');
select throws_ok($$select public.list_open_problems_by_ids(array[]::uuid[])$$, '42501', null, 'anon no puede pedir problemas por identificador');
reset role;

select * from finish();
rollback;
