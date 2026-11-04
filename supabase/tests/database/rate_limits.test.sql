begin;

select plan(87);

-- Both client roles are denied access to the private tables and helper.
set local role anon;
select throws_ok('select * from public.rate_limit_policies', '42501', null, 'anon cannot read policies');
select throws_ok($$insert into public.rate_limit_policies values ('x', 1, 1, 'x')$$, '42501', null, 'anon cannot insert policies');
select throws_ok('update public.rate_limit_policies set max_events = 1', '42501', null, 'anon cannot update policies');
select throws_ok('delete from public.rate_limit_policies', '42501', null, 'anon cannot delete policies');
select throws_ok('select * from public.rate_limit_events', '42501', null, 'anon cannot read events');
select throws_ok($$insert into public.rate_limit_events (user_id, action) values (null, 'x')$$, '42501', null, 'anon cannot insert events');
select throws_ok('update public.rate_limit_events set action = action', '42501', null, 'anon cannot update events');
select throws_ok('delete from public.rate_limit_events', '42501', null, 'anon cannot delete events');
select throws_ok($$select public.enforce_rate_limit('chat_send')$$, '42501', null, 'anon cannot execute the helper');
reset role;
set local role authenticated;
select throws_ok('select * from public.rate_limit_policies', '42501', null, 'authenticated cannot read policies');
select throws_ok($$insert into public.rate_limit_policies values ('x', 1, 1, 'x')$$, '42501', null, 'authenticated cannot insert policies');
select throws_ok('update public.rate_limit_policies set max_events = 1', '42501', null, 'authenticated cannot update policies');
select throws_ok('delete from public.rate_limit_policies', '42501', null, 'authenticated cannot delete policies');
select throws_ok('select * from public.rate_limit_events', '42501', null, 'authenticated cannot read events');
select throws_ok($$insert into public.rate_limit_events (user_id, action) values (null, 'x')$$, '42501', null, 'authenticated cannot insert events');
select throws_ok('update public.rate_limit_events set action = action', '42501', null, 'authenticated cannot update events');
select throws_ok('delete from public.rate_limit_events', '42501', null, 'authenticated cannot delete events');
select throws_ok($$select public.enforce_rate_limit('chat_send')$$, '42501', null, 'authenticated cannot execute the helper');
reset role;
select ok(not pg_catalog.has_sequence_privilege('anon', 'public.rate_limit_events_id_seq', 'USAGE')
  and not pg_catalog.has_sequence_privilege('authenticated', 'public.rate_limit_events_id_seq', 'USAGE'),
  'client roles cannot use the event identity sequence');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.rate_limit_events'::regclass)
  and (select relrowsecurity from pg_catalog.pg_class where oid = 'public.rate_limit_policies'::regclass),
  'both quota tables have RLS enabled');
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
select throws_ok($$select public.enforce_rate_limit('chat_send')$$, '42501', 'not authenticated', 'the helper requires a user even for its owner');
select throws_ok($$update public.rate_limit_policies set max_events = 0 where action = 'chat_send'$$, '23514', null, 'policies reject a nonpositive maximum');
select throws_ok($$update public.rate_limit_policies set window_seconds = 0 where action = 'chat_send'$$, '23514', null, 'policies reject a nonpositive window');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('81000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'quota-company1@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa Uno","role":"company"}'),
  ('81000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'quota-company2@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa Dos","role":"company"}'),
  ('81000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'quota-freelancer1@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Profesional Uno","role":"freelancer"}'),
  ('81000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'quota-freelancer2@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Profesional Dos","role":"freelancer"}');
insert into public.company_profiles (user_id, company_name, industry, country_code) values
  ('81000000-0000-4000-8000-000000000001', 'Empresa Uno', 'Servicios', 'PE'),
  ('81000000-0000-4000-8000-000000000002', 'Empresa Dos', 'Servicios', 'PE');
insert into public.business_problems (id, company_user_id, status, title)
select ('82000000-0000-4000-8000-' || pg_catalog.lpad(n::text, 12, '0'))::uuid,
  '81000000-0000-4000-8000-000000000001', 'open', 'Problema ' || n::text
from pg_catalog.generate_series(1, 8) n;

-- Two submitted fixtures support inbox and independently scoped chat tests.
insert into public.proposals (id, problem_id, freelancer_id, status, submitted_at, problem_title_snapshot)
values
  ('83000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000004', '81000000-0000-4000-8000-000000000004', 'submitted', now(), 'Problema 4'),
  ('83000000-0000-4000-8000-000000000005', '82000000-0000-4000-8000-000000000005', '81000000-0000-4000-8000-000000000004', 'submitted', now(), 'Problema 5');
insert into public.proposals (id, problem_id, freelancer_id, problem_title_snapshot, diagnosis, solution, deliverables, timeline, price)
values
  ('83000000-0000-4000-8000-000000000006', '82000000-0000-4000-8000-000000000006', '81000000-0000-4000-8000-000000000003', 'Problema 6', 'Diagnóstico', 'Solución', 'Entrega', 'Una semana', 100),
  ('83000000-0000-4000-8000-000000000007', '82000000-0000-4000-8000-000000000007', '81000000-0000-4000-8000-000000000003', 'Problema 7', 'Diagnóstico', 'Solución', 'Entrega', 'Una semana', 100),
  ('83000000-0000-4000-8000-000000000008', '82000000-0000-4000-8000-000000000008', '81000000-0000-4000-8000-000000000003', 'Problema 8', '', '', '', '', null);
insert into public.matches (id, problem_id, proposal_id, company_user_id, freelancer_id) values
  ('84000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000004', '83000000-0000-4000-8000-000000000004', '81000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000004'),
  ('84000000-0000-4000-8000-000000000005', '82000000-0000-4000-8000-000000000005', '83000000-0000-4000-8000-000000000005', '81000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000004');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok($$select public.enforce_rate_limit('nonexistent')$$, 'XX000', 'unknown rate limit action', 'a missing policy is a programming error');

-- Adjusting policies works without changing any function code.
update public.rate_limit_policies set max_events = 2 where action = 'proposal_draft_create';
update public.rate_limit_policies set max_events = 1 where action in ('proposal_draft_save', 'proposal_withdraw');
set local role authenticated;
select set_config('test.quota_draft1', public.save_proposal_draft('82000000-0000-4000-8000-000000000001', '{}'::jsonb)::text, true);
select is(public.save_proposal_draft('82000000-0000-4000-8000-000000000001',
  pg_catalog.jsonb_build_object('id', current_setting('test.quota_draft1'), 'solution', 'Editada'))::text,
  current_setting('test.quota_draft1'), 'editing uses its separate draft-save allowance');
select throws_ok($$select public.save_proposal_draft('82000000-0000-4000-8000-000000000001',
  pg_catalog.jsonb_build_object('id', current_setting('test.quota_draft1')))$$,
  '54000', 'rate limit exceeded', 'a second edit reaches the adjusted save limit');
select throws_ok($$select public.save_proposal_draft('82000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  '23505', null, 'the duplicate-draft validation takes priority over the quota');
select is(public.withdraw_proposal(current_setting('test.quota_draft1')::uuid)::text,
  current_setting('test.quota_draft1'), 'the first withdrawal succeeds');
select set_config('test.quota_draft2', public.save_proposal_draft('82000000-0000-4000-8000-000000000002', '{}'::jsonb)::text, true);
select throws_ok($$select public.save_proposal_draft('82000000-0000-4000-8000-000000000002', '{}'::jsonb)$$,
  '23505', null, 'a duplicate draft is reported even when creation quota is exhausted');
select throws_ok($$select public.withdraw_proposal(current_setting('test.quota_draft2')::uuid)$$,
  '54000', 'rate limit exceeded', 'repeated withdrawal of another proposal reaches the adjusted limit');
select throws_ok($$select public.withdraw_proposal(current_setting('test.quota_draft1')::uuid)$$,
  '22023', 'invalid proposal status transition', 'withdrawing an already withdrawn proposal reports validation first');
select throws_ok($$select public.save_proposal_draft('82000000-0000-4000-8000-000000000003', '{}'::jsonb)$$,
  '54000', 'rate limit exceeded', 'the adjusted create limit blocks a third draft');
select throws_ok($$select public.save_proposal_draft('82000000-0000-4000-8000-000000000003', '{"unexpected":1}'::jsonb)$$,
  '22023', 'invalid proposal data', 'invalid input takes priority over an exhausted create quota');
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select lives_ok($$select public.save_proposal_draft('82000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  'another freelancer has an independent create quota');
reset role;
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000003' and action = 'proposal_draft_create'), 2::bigint,
  'failed validation and rejected requests did not add create events');
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000003' and action = 'proposal_draft_save'), 1::bigint,
  'creation and editing are counted independently');
select is((select status from public.proposals where id = current_setting('test.quota_draft2')::uuid), 'draft',
  'a rejected withdrawal leaves its proposal unchanged');
update public.rate_limit_events set created_at = pg_catalog.clock_timestamp() - interval '61 minutes'
where user_id = '81000000-0000-4000-8000-000000000003' and action in ('proposal_draft_create', 'proposal_withdraw');
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select lives_ok($$select public.save_proposal_draft('82000000-0000-4000-8000-000000000003', '{}'::jsonb)$$,
  'a create event outside the rolling window no longer consumes quota');
select lives_ok($$select public.withdraw_proposal(current_setting('test.quota_draft2')::uuid)$$,
  'a withdrawal succeeds after the window expires');

-- State-preserving transitions remain free, even when their action is at capacity.
reset role;
update public.rate_limit_policies set max_events = 1 where action = 'problem_interaction';
set local role authenticated;
select is(public.set_problem_interaction('82000000-0000-4000-8000-000000000003', 'saved'), 'saved', 'a problem interaction is recorded');
select is(public.set_problem_interaction('82000000-0000-4000-8000-000000000003', 'saved'), 'saved', 'repeating the same interaction is a free no-op');
select is(public.set_problem_interaction('82000000-0000-4000-8000-000000000003', 'dismissed'), 'saved', 'a refused transition is also a free no-op');
select throws_ok($$select public.set_problem_interaction('82000000-0000-4000-8000-000000000003', null)$$,
  '54000', 'rate limit exceeded', 'an actual problem interaction change is limited');
reset role;
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000003' and action = 'problem_interaction'), 1::bigint,
  'problem no-ops did not consume events');
update public.rate_limit_policies set max_events = 600 where action = 'problem_interaction';
update public.rate_limit_policies set max_events = 1 where action = 'proposal_submit';
set local role authenticated;
select lives_ok($$select public.submit_proposal('83000000-0000-4000-8000-000000000006')$$, 'a valid proposal can be submitted');
select throws_ok($$select public.submit_proposal('83000000-0000-4000-8000-000000000008')$$,
  '22023', 'proposal requires diagnosis, solution, deliverables, timeline and price', 'an incomplete proposal reports its validation before the submit limit');
select throws_ok($$select public.submit_proposal('83000000-0000-4000-8000-000000000007')$$,
  '54000', 'rate limit exceeded', 'a second valid submission is limited');
reset role;
select is((select status from public.proposals where id = '83000000-0000-4000-8000-000000000007'), 'draft', 'a rejected submission leaves the proposal in draft');
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000003' and action = 'proposal_submit'), 1::bigint,
  'only the successful submission consumes quota');

update public.rate_limit_policies set max_events = 1 where action = 'company_interaction';
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(public.set_proposal_interaction('83000000-0000-4000-8000-000000000004', 'saved'), 'saved', 'a company interaction is recorded');
select is(public.set_proposal_interaction('83000000-0000-4000-8000-000000000004', 'saved'), 'saved', 'a company no-op is free at capacity');
select is(public.set_proposal_interaction('83000000-0000-4000-8000-000000000004', 'interested'), 'saved', 'a refused company transition remains a free no-op');
select throws_ok($$select public.set_proposal_interaction('83000000-0000-4000-8000-000000000004', null)$$,
  '54000', 'rate limit exceeded', 'an actual company interaction change is limited');
reset role;
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000001' and action = 'company_interaction'), 1::bigint,
  'company no-ops did not consume events');

-- A nested interaction failure must roll back both the submission and its quota event.
update public.rate_limit_policies set max_events = 5 where action = 'proposal_submit';
update public.rate_limit_policies set max_events = 1 where action = 'problem_interaction';
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select throws_ok($$select public.submit_proposal('83000000-0000-4000-8000-000000000007')$$,
  '54000', 'rate limit exceeded', 'an exhausted nested interaction rolls back the submission');
reset role;
select is((select status from public.proposals where id = '83000000-0000-4000-8000-000000000007'), 'draft', 'a nested quota failure restores the proposal status');
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000003' and action = 'proposal_submit'), 1::bigint,
  'a nested quota failure rolls back the submission event');

-- Business drafts distinguish first save from subsequent saves even with a supplied ID.
update public.rate_limit_policies set max_events = 1 where action in ('problem_draft_create', 'problem_draft_save', 'problem_publish');
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(public.save_business_problem_draft('85000000-0000-4000-8000-000000000001', '{"title":"Borrador"}'::jsonb)::text,
  '85000000-0000-4000-8000-000000000001', 'a new client-generated ID consumes the create allowance');
select is(public.save_business_problem_draft('85000000-0000-4000-8000-000000000001', '{"title":"Editado"}'::jsonb)::text,
  '85000000-0000-4000-8000-000000000001', 'an existing ID consumes the separate save allowance');
select throws_ok($$select public.save_business_problem_draft('85000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  '54000', 'rate limit exceeded', 'a second business draft edit reaches the adjusted limit');
select throws_ok($$select public.save_business_problem_draft('85000000-0000-4000-8000-000000000001', '{"current_step":9}'::jsonb)$$,
  '23514', null, 'an invalid wizard step retains its constraint error and takes priority over the save quota');
select throws_ok($$select public.save_business_problem_draft('85000000-0000-4000-8000-000000000001', '{"show_company_name":"wrong"}'::jsonb)$$,
  '22P02', null, 'invalid boolean input takes priority over the save quota');
select throws_ok($$select public.save_business_problem_draft('85000000-0000-4000-8000-000000000002', '{}'::jsonb)$$,
  '54000', 'rate limit exceeded', 'a second business draft reaches the adjusted create limit');
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok($$select public.save_business_problem_draft('85000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  '42501', 'problem not found', 'a different company cannot use another company draft');
select lives_ok($$select public.save_business_problem_draft('85000000-0000-4000-8000-000000000002', '{}'::jsonb)$$,
  'business draft quotas are isolated between companies');
reset role;
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000001' and action = 'problem_draft_create'), 1::bigint,
  'business draft creation records exactly one event');
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000001' and action = 'problem_draft_save'), 1::bigint,
  'business draft editing and invalid requests record exactly one event');

insert into public.business_problems (id, company_user_id, status, title, description, objectives, budget_choice, deadline_choice, reviewed_and_consented) values
  ('86000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'draft', 'Problema válido para publicar', 'Descripción suficientemente larga para publicar este problema de prueba.', array['save_time'], 'unknown', 'flexible', true),
  ('86000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', 'draft', 'Otro problema válido para publicar', 'Descripción suficientemente larga para publicar este problema de prueba.', array['save_time'], 'unknown', 'flexible', true),
  ('86000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000001', 'draft', '', '', '{}', '', '', false);
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(public.publish_business_problem('86000000-0000-4000-8000-000000000001')::text,
  '86000000-0000-4000-8000-000000000001', 'a valid business problem can be published');
select is(public.publish_business_problem('86000000-0000-4000-8000-000000000001')::text,
  '86000000-0000-4000-8000-000000000001', 'publishing an already open problem is a free idempotent retry');
select throws_ok($$select public.publish_business_problem('86000000-0000-4000-8000-000000000002')$$,
  '54000', 'rate limit exceeded', 'publishing a second problem is limited');
select throws_ok($$select public.publish_business_problem('86000000-0000-4000-8000-000000000003')$$,
  '22023', 'problem requires title, description, objective, budget, deadline and consent', 'publish validation takes priority over quota');
reset role;
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000001' and action = 'problem_publish'), 1::bigint,
  'publish retries and invalid publications do not consume quota');

-- The previous 30/minute chat contract and idempotent retries remain unchanged.
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((public.send_message('84000000-0000-4000-8000-000000000004', 'Primero', '87000000-0000-4000-8000-000000000004')).body,
  'Primero', 'the first chat message succeeds');
select is((select pg_catalog.count(*) from pg_catalog.generate_series(1, 29) n
  cross join lateral public.send_message('84000000-0000-4000-8000-000000000004', 'Mensaje ' || n::text)),
  29::bigint, 'the next 29 messages in the same conversation succeed');
select throws_ok($$select public.send_message('84000000-0000-4000-8000-000000000004', 'Mensaje 31')$$,
  'P0001', 'message rate limit: maximum 30 messages per minute', 'the default chat error remains compatible on message 31');
select throws_ok($$select public.send_message('84000000-0000-4000-8000-000000000004', '')$$,
  '22023', 'message body empty', 'chat body validation takes priority at capacity');
select is((public.send_message('84000000-0000-4000-8000-000000000004', 'Reintento', '87000000-0000-4000-8000-000000000004')).body,
  'Primero', 'an idempotent chat retry succeeds at capacity');
select lives_ok($$select public.send_message('84000000-0000-4000-8000-000000000005', 'Otro Match')$$,
  'the same sender has a separate allowance in another match');
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select lives_ok($$select public.send_message('84000000-0000-4000-8000-000000000004', 'Respuesta')$$,
  'the other participant has an independent chat allowance');
reset role;
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000001'
  and action = 'chat_send' and scope = '84000000-0000-4000-8000-000000000004'), 30::bigint,
  'a chat retry and invalid messages do not consume events');
update public.rate_limit_policies set max_events = 1 where action = 'chat_send';
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.send_message('84000000-0000-4000-8000-000000000005', 'Segundo')$$,
  '54000', 'rate limit exceeded', 'a customized chat policy uses the generic error instead of an outdated 30/minute message');
reset role;
update public.rate_limit_policies set max_events = 30 where action = 'chat_send';
update public.rate_limit_events set created_at = pg_catalog.clock_timestamp() - interval '61 seconds'
where user_id = '81000000-0000-4000-8000-000000000001' and action = 'chat_send'
  and scope = '84000000-0000-4000-8000-000000000004';
set local role authenticated;
select lives_ok($$select public.send_message('84000000-0000-4000-8000-000000000004', 'Después de la ventana')$$,
  'chat permits new messages after the minute expires');
reset role;

-- The retry hint reflects the actual remaining window, and cleanup has a fixed budget.
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
create function pg_temp.capture_rate_limit_hint(p_action text) returns text language plpgsql as $$
declare v_hint text;
begin
  perform public.enforce_rate_limit(p_action);
  return null;
exception when sqlstate '54000' then
  get stacked diagnostics v_hint = pg_exception_hint;
  return v_hint;
end;
$$;
select matches(pg_temp.capture_rate_limit_hint('proposal_draft_save'), '^Retry after [1-9][0-9]* seconds[.]$', 'the quota error reports a positive retry time');
insert into public.rate_limit_policies (action, max_events, window_seconds, description)
values ('test_reduced_limit', 2, 60, 'Test retry after a limit reduction');
insert into public.rate_limit_events (user_id, action, created_at)
select '81000000-0000-4000-8000-000000000003', 'test_reduced_limit', pg_catalog.clock_timestamp() - age_seconds * interval '1 second'
from pg_catalog.unnest(array[50, 20, 10]) age_seconds;
select ok((pg_catalog.substring(pg_temp.capture_rate_limit_hint('test_reduced_limit'), '[0-9]+'))::integer between 25 and 41,
  'the hint waits for enough events to expire when a limit is reduced below the current count');
update public.rate_limit_policies set window_seconds = 777600 where action = 'company_interaction';
insert into public.rate_limit_events (user_id, action, created_at)
select '81000000-0000-4000-8000-000000000003', 'problem_interaction', pg_catalog.clock_timestamp() - interval '8 days'
from pg_catalog.generate_series(1, 30);
insert into public.rate_limit_events (user_id, action, created_at)
values ('81000000-0000-4000-8000-000000000003', 'company_interaction', pg_catalog.clock_timestamp() - interval '8 days');
select public.enforce_rate_limit('problem_draft_save');
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000003'
  and action = 'problem_interaction' and created_at < pg_catalog.clock_timestamp() - interval '7 days'), 5::bigint,
  'one enforcement removes at most 25 old events');
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000003'
  and action = 'company_interaction' and created_at < pg_catalog.clock_timestamp() - interval '7 days'), 1::bigint,
  'cleanup preserves events still covered by a configured window over seven days');
select public.enforce_rate_limit('problem_publish');
select is((select count(*) from public.rate_limit_events where user_id = '81000000-0000-4000-8000-000000000003'
  and action = 'problem_interaction' and created_at < pg_catalog.clock_timestamp() - interval '7 days'), 0::bigint,
  'subsequent successful calls continue bounded cleanup');

select * from finish();
rollback;
