begin;

select plan(9);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('0a000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'problem-limits-company@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa","role":"company"}');

insert into public.company_profiles (user_id, company_name, industry, country_code)
values ('0a000000-0000-4000-8000-000000000001', 'Empresa de límites', 'Comercio', 'PE');

-- Restricciones de la tabla (valen para cualquier camino de escritura).
select throws_ok(
  $$insert into public.business_problems (company_user_id, impacts) values ('0a000000-0000-4000-8000-000000000001', array_fill('time'::text, array[11]))$$,
  '23514', null, 'more than 10 impacts are rejected'
);
select throws_ok(
  $$insert into public.business_problems (company_user_id, objectives) values ('0a000000-0000-4000-8000-000000000001', array_fill('organize'::text, array[11]))$$,
  '23514', null, 'more than 10 objectives are rejected'
);
select throws_ok(
  $$insert into public.business_problems (company_user_id, impacts) values ('0a000000-0000-4000-8000-000000000001', array['inventado'])$$,
  '23514', null, 'an impact outside the offered options is rejected'
);
select throws_ok(
  $$insert into public.business_problems (company_user_id, objectives) values ('0a000000-0000-4000-8000-000000000001', array['inventado'])$$,
  '23514', null, 'an objective outside the offered options is rejected'
);
select throws_ok(
  $$insert into public.business_problems (company_user_id, industry_snapshot) values ('0a000000-0000-4000-8000-000000000001', pg_catalog.repeat('x', 101))$$,
  '23514', null, 'an industry snapshot over 100 characters is rejected'
);
select lives_ok(
  $$insert into public.business_problems (company_user_id, impacts, objectives, industry_snapshot) values ('0a000000-0000-4000-8000-000000000001', array['time', 'errors'], array['organize', 'automate'], pg_catalog.repeat('x', 100))$$,
  'valid arrays and a 100-character industry are stored'
);

-- Mismo tope por la RPC que usa la interfaz.
set local role authenticated;
select set_config('request.jwt.claim.sub', '0a000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"0a000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.save_business_problem_draft(null, pg_catalog.jsonb_build_object('title', 'Título válido de prueba', 'impacts', (select pg_catalog.jsonb_agg('time'::text) from pg_catalog.generate_series(1, 50000))))$$,
  '23514', null, 'the draft RPC rejects 50 000 impacts'
);
select throws_ok(
  $$select public.save_business_problem_draft(null, pg_catalog.jsonb_build_object('title', 'Título válido de prueba', 'objectives', (select pg_catalog.jsonb_agg('organize'::text) from pg_catalog.generate_series(1, 50000))))$$,
  '23514', null, 'the draft RPC rejects 50 000 objectives'
);
select set_config('test.problem_limits_id', public.save_business_problem_draft(null, pg_catalog.jsonb_build_object('title', 'Título válido de prueba', 'industry_snapshot', pg_catalog.repeat('x', 100000)))::text, true);
reset role;
select is(
  (select industry_snapshot from public.business_problems where id = current_setting('test.problem_limits_id')::uuid),
  'Comercio', 'the draft RPC ignores a client-supplied industry snapshot and uses the company profile'
);

select * from finish();
rollback;
