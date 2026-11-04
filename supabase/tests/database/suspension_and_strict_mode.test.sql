begin;
select no_plan();
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
 ('c1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'susp-admin@example.test', '', now(), '{}', '{"full_name":"Admin","role":"company"}'),
 ('c1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'susp-company@example.test', '', now(), '{}', '{"full_name":"Empresa","role":"company"}'),
 ('c1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'susp-freelancer@example.test', '', now(), '{}', '{"full_name":"Profesional","role":"freelancer"}'),
 ('c1000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'susp-active@example.test', '', now(), '{}', '{"full_name":"Profesional activo","role":"freelancer"}');
insert into public.admins(user_id) values ('c1000000-0000-4000-8000-000000000001');
insert into public.company_profiles(user_id, company_name, industry, country_code)
values ('c1000000-0000-4000-8000-000000000002', 'Empresa', 'Servicios', 'PE');
update public.profiles set is_public = true where id in ('c1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000004');
update public.freelancer_profiles set headline = 'Profesional' where user_id in ('c1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000004');
insert into public.business_problems(id, company_user_id, status, title, description, objectives, budget_choice, deadline_choice, reviewed_and_consented, published_at) values
 ('c2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'open', 'Problema abierto uno', repeat('x', 50), array['save_time'], 'unknown', 'flexible', true, now()),
 ('c2000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', 'open', 'Problema abierto dos', repeat('x', 50), array['save_time'], 'unknown', 'flexible', true, now()),
 ('c2000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', 'draft', 'Problema para publicar', repeat('x', 50), array['save_time'], 'unknown', 'flexible', true, null),
 ('c2000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000002', 'open', 'Problema abierto cuatro', repeat('x', 50), array['save_time'], 'unknown', 'flexible', true, now()),
 ('c2000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000002', 'draft', 'Segundo problema para publicar', repeat('x', 50), array['save_time'], 'unknown', 'flexible', true, null),
 ('c2000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000002', 'draft', 'Tercer problema para publicar', repeat('x', 50), array['save_time'], 'unknown', 'flexible', true, null);
insert into public.proposals(id, problem_id, freelancer_id, status, submitted_at, problem_title_snapshot, diagnosis, solution, deliverables, timeline, price) values
 ('c3000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'submitted', now(), 'Problema abierto uno', 'Diagnóstico', 'Solución', 'Entrega', 'Un mes', 100),
 ('c3000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000004', 'draft', null, 'Problema abierto dos', 'Diagnóstico', 'Solución', 'Entrega', 'Un mes', 100),
 ('c3000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000003', 'draft', null, 'Problema abierto cuatro', 'Diagnóstico', 'Solución', 'Entrega', 'Un mes', 100),
 ('c3000000-0000-4000-8000-000000000004', 'c2000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000003', 'submitted', now(), 'Problema abierto dos', 'Diagnóstico', 'Solución', 'Entrega', 'Un mes', 100);
insert into public.matches(id, problem_id, proposal_id, company_user_id, freelancer_id)
values ('c4000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000003');

-- Default mode publishes without verification.
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.publish_business_problem('c2000000-0000-4000-8000-000000000003')$$, 'strict mode off permits publishing');
reset role;
update public.app_settings set value = 'true'::jsonb where key = 'require_company_verification_to_publish';
set local role authenticated;
select throws_ok($$select public.publish_business_problem('c2000000-0000-4000-8000-000000000005')$$,
 'P0001', 'company verification required to publish', 'strict mode blocks an unverified new publication');
select lives_ok($$select public.publish_business_problem('c2000000-0000-4000-8000-000000000003')$$, 'strict mode does not invalidate an already open problem');
select public.submit_company_verification('{"legal_name":"Empresa SAC","tax_id":"12345678901","website_url":"https://empresa.test"}');
reset role;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.admin_verify_company('c1000000-0000-4000-8000-000000000002');
select set_config('test.before_problem_suspend', (select open_problems::text from public.get_public_counters()), true);
select public.admin_set_problem_suspended('c2000000-0000-4000-8000-000000000002', true, 'En revisión');
select is((select open_problems from public.get_public_counters()), current_setting('test.before_problem_suspend')::bigint - 1, 'suspended problem is excluded from landing');
reset role;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.publish_business_problem('c2000000-0000-4000-8000-000000000005')$$, 'strict mode permits verified company to publish');
select throws_ok($$select public.set_proposal_interaction('c3000000-0000-4000-8000-000000000004', 'saved')$$,
 'P0001', 'problem suspended', 'suspended problem rejects new company proposal interactions');
select ok(exists (select 1 from public.list_problem_proposals('c2000000-0000-4000-8000-000000000002') where id = 'c3000000-0000-4000-8000-000000000004'), 'existing submitted proposal remains readable to its company');
reset role;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select ok(not exists (select 1 from pg_catalog.jsonb_array_elements(public.list_open_business_problems()) p where p->>'id' = 'c2000000-0000-4000-8000-000000000002'), 'suspended problem is absent from feed');
select ok(exists (select 1 from pg_catalog.jsonb_array_elements(public.list_open_business_problems()) p where p->>'id' = 'c2000000-0000-4000-8000-000000000001' and p->'company_verified' = 'true'::jsonb and not (p ? 'legal_name') and not (p ? 'tax_id')), 'feed exposes only verification boolean');
select throws_ok($$select public.save_proposal_draft('c2000000-0000-4000-8000-000000000002', '{}'::jsonb)$$, 'P0001', 'problem suspended', 'suspended problem rejects proposal draft');
select throws_ok($$select public.submit_proposal('c3000000-0000-4000-8000-000000000002')$$, 'P0001', 'problem suspended', 'suspended problem rejects proposal submission');
select throws_ok($$select public.set_problem_interaction('c2000000-0000-4000-8000-000000000002', 'saved')$$, 'P0001', 'problem suspended', 'suspended problem rejects new swipe');
select ok(exists (select 1 from public.proposals where id = 'c3000000-0000-4000-8000-000000000002'), 'existing proposal remains readable');
reset role;
select set_config('test.before_suspend', (select row_to_json(c)::text from public.get_public_counters() c), true);
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.admin_set_user_suspended('c1000000-0000-4000-8000-000000000003', true, 'Motivo visible');
reset role;
select is((select freelancers_active from public.get_public_counters()), (current_setting('test.before_suspend')::jsonb->>'freelancers_active')::bigint - 1, 'suspended freelancer excluded from landing');
select is((select proposals_submitted from public.get_public_counters()), (current_setting('test.before_suspend')::jsonb->>'proposals_submitted')::bigint - 1, 'suspended freelancer proposals excluded from landing');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select reason from public.get_my_account_status()), 'Motivo visible', 'suspended user can read own reason');
select is((select counterpart_company_verified from public.list_my_matches() limit 1), true, 'match exposes company verification');
select is((select counterpart_company_verified from public.list_conversations() limit 1), true, 'chat exposes company verification');
select is((select company_verified from public.list_my_proposal_company_trust() where proposal_id = 'c3000000-0000-4000-8000-000000000001'), true, 'own proposals expose company verification');
select lives_ok('select public.ensure_my_profile()', 'suspended user can read own profile');
select lives_ok('select public.list_my_matches()', 'suspended user can read matches');
select throws_ok($$select public.save_proposal_draft('c2000000-0000-4000-8000-000000000004', '{"id":"c3000000-0000-4000-8000-000000000003"}'::jsonb)$$, 'P0001', 'account suspended', 'suspended user cannot save proposal');
select throws_ok($$select public.save_proposal_draft('c2000000-0000-4000-8000-000000000003', '{}'::jsonb)$$, 'P0001', 'account suspended', 'suspended user cannot create a proposal');
select throws_ok($$select public.withdraw_proposal('c3000000-0000-4000-8000-000000000003')$$, 'P0001', 'account suspended', 'suspended user cannot withdraw a proposal');
select throws_ok($$select public.submit_proposal('c3000000-0000-4000-8000-000000000003')$$, 'P0001', 'account suspended', 'suspended user cannot submit proposal');
select throws_ok($$select public.set_problem_interaction('c2000000-0000-4000-8000-000000000001', 'saved')$$, 'P0001', 'account suspended', 'suspended user cannot swipe');
select throws_ok($$select public.send_message('c4000000-0000-4000-8000-000000000001', 'Hola')$$, 'P0001', 'account suspended', 'suspended user cannot send a message');
select throws_ok($$select public.save_my_profile('{}'::jsonb)$$, 'P0001', 'account suspended', 'suspended user cannot save profile');
select throws_ok($$insert into public.portfolio_projects(freelancer_user_id, title) values ('c1000000-0000-4000-8000-000000000003', 'Proyecto')$$, 'P0001', 'account suspended', 'suspended user cannot save a portfolio project');
select throws_ok($$update public.freelancer_profiles set headline = 'Otra' where user_id = auth.uid()$$, 'P0001', 'account suspended', 'suspended user cannot edit freelancer profile directly');
select throws_ok($$insert into public.freelancer_skills(freelancer_user_id, custom_name) values (auth.uid(), 'Diseño')$$, 'P0001', 'account suspended', 'suspended user cannot modify skills');
select throws_ok($$insert into storage.objects(bucket_id, name, metadata) values ('avatars', 'c1000000-0000-4000-8000-000000000003/c1000000-0000-4000-8000-000000000003.webp', '{"mimetype":"image/webp","size":10}'::jsonb)$$,
  '42501', null, 'suspended user cannot upload an avatar');
reset role;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.admin_set_user_suspended('c1000000-0000-4000-8000-000000000002', true, 'Motivo empresa');
reset role;
select is((select companies_published from public.get_public_counters()), (current_setting('test.before_suspend')::jsonb->>'companies_published')::bigint - 1, 'suspended company excluded from landing');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.save_company_profile('{"company_name":"Empresa","industry":"Servicios","country_code":"PE"}'::jsonb)$$, 'P0001', 'account suspended', 'suspended company cannot save profile');
select throws_ok($$select public.submit_company_verification('{"legal_name":"Empresa SAC","tax_id":"12345678901","website_url":"https://empresa.test"}'::jsonb)$$, 'P0001', 'account suspended', 'suspended company cannot submit verification');
select throws_ok($$select public.save_business_problem_draft(null, '{}'::jsonb)$$, 'P0001', 'account suspended', 'suspended company cannot create problem');
select throws_ok($$select public.save_business_problem_draft('c2000000-0000-4000-8000-000000000006', '{}'::jsonb)$$, 'P0001', 'account suspended', 'suspended company cannot save an existing draft');
select throws_ok($$select public.publish_business_problem('c2000000-0000-4000-8000-000000000006')$$, 'P0001', 'account suspended', 'suspended company cannot publish');
select throws_ok($$select public.begin_business_problem_edit('c2000000-0000-4000-8000-000000000001')$$, 'P0001', 'account suspended', 'suspended company cannot change problem');
select throws_ok($$select public.set_proposal_interaction('c3000000-0000-4000-8000-000000000001', 'saved')$$, 'P0001', 'account suspended', 'suspended company cannot swipe proposals');
select * from finish();
rollback;
