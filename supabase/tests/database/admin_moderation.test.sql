begin;
create function public.test_ver(p_company uuid) returns timestamptz language sql security definer set search_path = ''
as $$ select v.updated_at from public.company_verifications v where v.company_user_id = p_company $$;
grant execute on function public.test_ver(uuid) to anon, authenticated;

select no_plan();
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
 ('b1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin-one@example.test', '', now(), '{}', '{"full_name":"Admin Uno","role":"company"}'),
 ('b1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'admin-two@example.test', '', now(), '{}', '{"full_name":"Admin Dos","role":"freelancer"}'),
 ('b1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'not-admin@example.test', '', now(), '{}', '{"full_name":"Persona % Literal","role":"freelancer"}'),
 ('b1000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'other-person@example.test', '', now(), '{}', '{"full_name":"Persona Normal","role":"company"}');
insert into public.admins(user_id) values ('b1000000-0000-4000-8000-000000000001'), ('b1000000-0000-4000-8000-000000000002');
insert into public.company_profiles(user_id, company_name, industry, country_code)
values ('b1000000-0000-4000-8000-000000000004', 'Empresa normal', 'Servicios', 'PE');
insert into public.business_problems(id, company_user_id, title, status)
values ('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000004', 'Problema de prueba', 'open');

-- The complete admin API must reject any authenticated non-admin, regardless of arguments.
create temporary table admin_calls (sql_text text) on commit drop;
insert into admin_calls values
 ('select public.admin_list_verification_requests()'),
 ($$select public.admin_verify_company('b1000000-0000-4000-8000-000000000004', public.test_ver('b1000000-0000-4000-8000-000000000004'))$$),
 ($$select public.admin_reject_company('b1000000-0000-4000-8000-000000000004', public.test_ver('b1000000-0000-4000-8000-000000000004'), 'motivo válido')$$),
 ($$select public.admin_undo_company_verification('b1000000-0000-4000-8000-000000000004')$$),
 ('select public.admin_list_users()'),
 ($$select public.admin_set_user_suspended('b1000000-0000-4000-8000-000000000004', true, 'motivo')$$),
 ('select public.admin_list_problems()'),
 ($$select public.admin_set_problem_suspended('b2000000-0000-4000-8000-000000000001', true, 'motivo')$$),
 ('select public.admin_get_summary()'),
 ('select public.admin_get_settings()'),
 ($$select public.admin_set_setting('require_company_verification_to_publish', 'true'::jsonb)$$);
grant select on admin_calls to anon, authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is(public.is_admin(), false, 'authenticated user can check their own admin status');
select throws_ok(sql_text, '42501', 'not an admin', 'non-admin denied: ' || sql_text) from admin_calls;
select throws_ok('select * from public.admins', '42501', null, 'non-admin cannot read admins');
select throws_ok('select * from public.admin_actions', '42501', null, 'non-admin cannot read audit rows');
select throws_ok('select * from public.app_settings', '42501', null, 'non-admin cannot read settings');
reset role;
set local role anon;
select throws_ok('select public.is_admin()', '42501', null, 'anon cannot execute is_admin');
select throws_ok(sql_text, '42501', null, 'anon denied: ' || sql_text) from admin_calls;
select throws_ok('select * from public.admins', '42501', null, 'anon cannot read admins');
select throws_ok('select * from public.admin_actions', '42501', null, 'anon cannot read actions');
select throws_ok('select * from public.app_settings', '42501', null, 'anon cannot read settings');
reset role;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.is_admin(), true, 'admin can check own admin status');
select throws_ok('select * from public.admins', '42501', null, 'admin also has no direct table access');
select is((select count(*) from public.admin_list_users('%', 'all', 'all')), 1::bigint, 'search treats percent as a literal');
select is((select count(*) from public.admin_list_users('_', 'all', 'all')), 0::bigint, 'search treats underscore as a literal');
select is((select count(*) from public.admin_list_users('', 'all', 'all', null, null, 0)), 1::bigint, 'page size is bounded below');
select is((select count(*) from public.admin_list_users('not-admin@example.test', 'freelancer', 'active')), 1::bigint, 'search matches email and filters');
select is((select count(*) from public.admin_list_problems('Empresa normal', 'open')), 1::bigint, 'problem search matches company');
with first_page as (select * from public.admin_list_users('', 'all', 'all', null, null, 1))
select isnt((select user_id from first_page),
  (select next_page.user_id from first_page f cross join lateral public.admin_list_users('', 'all', 'all', f.created_at, f.user_id, 1) next_page),
  'user keyset pagination advances even when timestamps tie');
select throws_ok($$select public.admin_set_user_suspended('b1000000-0000-4000-8000-000000000001', true, 'motivo')$$,
 '42501', 'cannot suspend an admin', 'admin cannot suspend self');
select throws_ok($$select public.admin_set_user_suspended('b1000000-0000-4000-8000-000000000002', true, 'motivo')$$,
 '42501', 'cannot suspend an admin', 'admin cannot suspend another admin');
select lives_ok($$select public.admin_set_user_suspended('b1000000-0000-4000-8000-000000000003', true, 'Motivo de prueba')$$, 'admin suspends user');
select lives_ok($$select public.admin_set_user_suspended('b1000000-0000-4000-8000-000000000003', true, 'Motivo de prueba')$$, 'repeated suspension is idempotent');
select lives_ok($$select public.admin_set_problem_suspended('b2000000-0000-4000-8000-000000000001', true, 'Revisión')$$, 'admin suspends problem');
select is((select count(*) from public.admin_list_problems('', 'suspended')), 1::bigint, 'suspended filter uses the suspension column');
select is((select value from public.admin_get_settings() where key = 'require_company_verification_to_publish'), 'false'::jsonb, 'strict mode defaults off');
select ok((select pending_verifications >= 0 and verified_companies >= 0 and open_problems >= 0 and active_freelancers >= 0 from public.admin_get_summary()), 'admin can read all four summary counters');
select lives_ok($$select public.admin_set_setting('require_company_verification_to_publish', 'true'::jsonb)$$, 'admin changes strict mode');
select lives_ok($$select public.admin_set_setting('require_company_verification_to_publish', 'true'::jsonb)$$, 'repeating a setting is an idempotent no-op');
select is((select value from public.admin_get_settings() where key = 'require_company_verification_to_publish'), 'true'::jsonb, 'setting change is readable');
select lives_ok($$select public.admin_set_problem_suspended('b2000000-0000-4000-8000-000000000001', false, 'Revisión terminada')$$, 'admin reactivates problem');
select lives_ok($$select public.admin_set_user_suspended('b1000000-0000-4000-8000-000000000003', false, 'Revisión terminada')$$, 'admin reactivates user');
reset role;
select is((select count(*) from public.admin_actions where admin_id = 'b1000000-0000-4000-8000-000000000001'), 5::bigint,
  'every change is audited and the repeated suspension produces no row');
select ok((select metadata -> 'new_value' = 'true'::jsonb from public.admin_actions where action = 'set_setting'), 'setting audit includes old and new values');
select * from finish();
rollback;
