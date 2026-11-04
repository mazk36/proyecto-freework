begin;

select plan(15);

-- Compare against the existing database so these tests do not require an empty seed.
select set_config('test.counters_before', (select row_to_json(c)::text from public.get_public_counters() c), true);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('90000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'counters-company-one@example.test', '', now(), '{}', '{"full_name":"Empresa Uno","role":"company"}'),
  ('90000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'counters-company-two@example.test', '', now(), '{}', '{"full_name":"Empresa Dos","role":"company"}'),
  ('90000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'counters-company-draft@example.test', '', now(), '{}', '{"full_name":"Empresa Tres","role":"company"}'),
  ('90000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'counters-public@example.test', '', now(), '{}', '{"full_name":"Profesional Público","role":"freelancer"}'),
  ('90000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'counters-private@example.test', '', now(), '{}', '{"full_name":"Profesional Privado","role":"freelancer"}'),
  ('90000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'counters-no-detail@example.test', '', now(), '{}', '{"full_name":"Sin Detalle","role":"freelancer"}'),
  ('90000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'counters-company-paused@example.test', '', now(), '{}', '{"full_name":"Empresa Pausada","role":"company"}');

insert into public.business_problems (id, company_user_id, status) values
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'open'),
  ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000001', 'open'),
  ('91000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000001', 'paused'),
  ('91000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000002', 'closed'),
  ('91000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000003', 'draft'),
  ('91000000-0000-4000-8000-000000000006', '90000000-0000-4000-8000-000000000007', 'paused');

-- The auth trigger already creates each profile; adjust the fields these tests depend on.
update public.profiles set display_name = 'Público', slug = 'counters-public', is_public = true where id = '90000000-0000-4000-8000-000000000004';
update public.profiles set display_name = 'Privado', slug = 'counters-private', is_public = false where id = '90000000-0000-4000-8000-000000000005';
update public.profiles set display_name = 'Sin Detalle', slug = 'counters-no-detail', is_public = true where id = '90000000-0000-4000-8000-000000000006';
-- freelancer_profiles rows already exist (created with the profile); only user 4 and 5 get a headline.
update public.freelancer_profiles set headline = 'Diseñadora de servicios' where user_id in ('90000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000005');

insert into public.proposals (problem_id, freelancer_id, status, submitted_at, problem_title_snapshot) values
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000004', 'submitted', now(), 'Problema'),
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000005', 'draft', null, 'Problema'),
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000006', 'withdrawn', now(), 'Problema');

set local role anon;
select lives_ok('select * from public.get_public_counters()', 'anon can call the aggregates RPC');
select is((select count(*) from public.get_public_counters()), 1::bigint, 'the RPC returns one row');
select is((select pg_typeof(open_problems)::text from public.get_public_counters()), 'bigint', 'open problems is an integer');
select is((select pg_typeof(companies_published)::text from public.get_public_counters()), 'bigint', 'companies is an integer');
select is((select pg_typeof(freelancers_active)::text from public.get_public_counters()), 'bigint', 'freelancers is an integer');
select is((select pg_typeof(proposals_submitted)::text from public.get_public_counters()), 'bigint', 'proposals is an integer');
select is((select open_problems from public.get_public_counters()), (current_setting('test.counters_before')::jsonb->>'open_problems')::bigint + 2, 'only open problems count');
select is((select companies_published from public.get_public_counters()), (current_setting('test.counters_before')::jsonb->>'companies_published')::bigint + 3, 'open, paused and closed companies count once; draft-only companies do not');
select is((select freelancers_active from public.get_public_counters()), (current_setting('test.counters_before')::jsonb->>'freelancers_active')::bigint + 1, 'only public freelancer profiles with a headline count');
select is((select proposals_submitted from public.get_public_counters()), (current_setting('test.counters_before')::jsonb->>'proposals_submitted')::bigint + 1, 'submitted proposals count, drafts and withdrawn proposals do not');
select throws_ok('select * from public.business_problems', '42501', null, 'anon still cannot read problems directly');
select throws_ok('select * from public.proposals', '42501', null, 'anon still cannot read proposals directly');
select is((select count(*) from public.profiles where id = '90000000-0000-4000-8000-000000000005'), 0::bigint, 'existing RLS still hides private profiles from anon');
select is((select count(*) from public.profiles where id = '90000000-0000-4000-8000-000000000004'), 1::bigint, 'existing RLS still exposes public profiles');
reset role;
set local role authenticated;
select lives_ok('select * from public.get_public_counters()', 'authenticated can call the aggregates RPC');

select * from finish();
rollback;
