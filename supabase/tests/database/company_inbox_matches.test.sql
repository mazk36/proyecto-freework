begin;

-- Shared with apps/web/lib/company-interaction-transitions.test.ts. SQL NULL means unseen.
create temporary table company_transition_cases (
  case_no integer primary key,
  current_state text,
  next_state text,
  expected_state text
);
-- BEGIN COMPANY TRANSITION CASES
insert into company_transition_cases (case_no, current_state, next_state, expected_state) values
  (1, null, null, null),
  (2, null, 'unseen', null),
  (3, null, 'saved', 'saved'),
  (4, null, 'dismissed', 'dismissed'),
  (5, null, 'interested', 'interested'),
  (6, 'saved', null, null),
  (7, 'saved', 'unseen', 'saved'),
  (8, 'saved', 'saved', 'saved'),
  (9, 'saved', 'dismissed', 'saved'),
  (10, 'saved', 'interested', 'saved'),
  (11, 'dismissed', null, null),
  (12, 'dismissed', 'unseen', 'dismissed'),
  (13, 'dismissed', 'saved', 'dismissed'),
  (14, 'dismissed', 'dismissed', 'dismissed'),
  (15, 'dismissed', 'interested', 'dismissed'),
  (16, 'interested', null, 'interested'),
  (17, 'interested', 'unseen', 'interested'),
  (18, 'interested', 'saved', 'interested'),
  (19, 'interested', 'dismissed', 'interested'),
  (20, 'interested', 'interested', 'interested');
-- END COMPANY TRANSITION CASES

select plan(20 + 75);
grant select on company_transition_cases to authenticated;

set local role anon;
select throws_ok('select * from public.company_proposal_interactions', '42501', null, 'anon cannot read company interactions');
select throws_ok('select * from public.matches', '42501', null, 'anon cannot read matches');
select throws_ok($$insert into public.company_proposal_interactions (company_user_id, proposal_id, state) values (null, null, 'saved')$$, '42501', null, 'anon cannot insert interactions');
select throws_ok($$update public.company_proposal_interactions set state = 'saved'$$, '42501', null, 'anon cannot update interactions');
select throws_ok('delete from public.company_proposal_interactions', '42501', null, 'anon cannot delete interactions');
select throws_ok('insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id) values (null, null, null, null)', '42501', null, 'anon cannot insert matches');
select throws_ok($$update public.matches set status = 'matched'$$, '42501', null, 'anon cannot update matches');
select throws_ok('delete from public.matches', '42501', null, 'anon cannot delete matches');
select throws_ok($$select * from public.list_problem_proposals(null)$$, '42501', null, 'anon cannot list proposals');
select throws_ok($$select public.set_proposal_interaction(null, 'saved')$$, '42501', null, 'anon cannot change interactions');
select throws_ok('select * from public.list_my_matches()', '42501', null, 'anon cannot list matches');
reset role;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'inbox-company@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa Uno","role":"company"}'),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'inbox-other-company@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa Dos","role":"company"}'),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'inbox-author@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Autora Pública","role":"freelancer"}'),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'inbox-other-freelancer@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Autor Privado","role":"freelancer"}'),
  ('00000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'inbox-draft-author@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Otra Autora","role":"freelancer"}');

insert into public.company_profiles (user_id, company_name, industry, country_code) values
  ('00000000-0000-4000-8000-000000000001', 'Empresa Visible', 'Servicios', 'PE'),
  ('00000000-0000-4000-8000-000000000002', 'Otra Empresa', 'Servicios', 'PE');
update public.profiles set is_public = true where id = '00000000-0000-4000-8000-000000000003';
update public.freelancer_profiles set headline = 'Titular público' where user_id = '00000000-0000-4000-8000-000000000003';
update public.freelancer_profiles set headline = 'Titular privado' where user_id = '00000000-0000-4000-8000-000000000004';

insert into public.business_problems (id, company_user_id, status)
select ('11000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001', 'open'::public.business_problem_status
from company_transition_cases;
insert into public.business_problems (id, company_user_id, status, title, show_company_name) values
  ('12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'open', 'Problema visible', true),
  ('12000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'open', 'Otro problema', false),
  ('12000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'paused', 'Pausado', false),
  ('12000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'closed', 'Cerrado', false),
  ('12000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'draft', 'Borrador', false),
  ('12000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'open', 'Retiro', false),
  ('12000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', 'open', 'Atomicidad', false),
  ('12000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', 'open', 'Match existente', false);

insert into public.proposals (id, problem_id, freelancer_id, status, submitted_at)
select ('21000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  ('11000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000003', 'submitted', now()
from company_transition_cases;
insert into public.proposals (
  id, problem_id, freelancer_id, status, diagnosis, solution, deliverables, timeline,
  price, currency, recurring_costs, maintenance_warranty, related_experience, submitted_at
) values
  ('22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'submitted', 'Diagnóstico A', 'Solución A', 'Entrega A', 'Tres semanas', 999.99, 'USD', 'Costos A', 'Garantía A', 'Experiencia A', '2026-01-01 10:00:00+00'),
  ('22000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 'submitted', 'Diagnóstico B', 'Solución B', 'Entrega B', 'Un mes', 5.25, 'PEN', 'Costos B', 'Garantía B', 'Experiencia B', '2026-01-02 10:00:00+00'),
  ('22000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 'draft', '', '', '', '', null, 'PEN', '', '', '', null),
  ('22000000-0000-4000-8000-000000000004', '12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'withdrawn', '', '', '', '', null, 'PEN', '', '', '', now()),
  ('22000000-0000-4000-8000-000000000005', '12000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000004', 'submitted', '', '', '', '', 10, 'PEN', '', '', '', now()),
  ('22000000-0000-4000-8000-000000000006', '12000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'submitted', '', '', '', '', 10, 'PEN', '', '', '', now()),
  ('22000000-0000-4000-8000-000000000007', '12000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003', 'submitted', '', '', '', '', 10, 'PEN', '', '', '', now()),
  ('22000000-0000-4000-8000-000000000008', '12000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003', 'submitted', '', '', '', '', 10, 'PEN', '', '', '', now()),
  ('22000000-0000-4000-8000-000000000009', '12000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000003', 'submitted', '', '', '', '', 10, 'PEN', '', '', '', now()),
  ('22000000-0000-4000-8000-000000000010', '12000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000003', 'submitted', '', '', '', '', 10, 'PEN', '', '', '', now()),
  ('22000000-0000-4000-8000-000000000011', '12000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000003', 'submitted', '', '', '', '', 10, 'PEN', '', '', '', now());

insert into public.company_proposal_interactions (company_user_id, proposal_id, state, created_at, updated_at)
select '00000000-0000-4000-8000-000000000001',
  ('21000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  current_state, '2001-01-01 00:00:00+00', '2001-01-01 00:00:00+00'
from company_transition_cases where current_state is not null;
insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id)
select ('11000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  ('21000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003'
from company_transition_cases where current_state = 'interested';
insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id)
values ('12000000-0000-4000-8000-000000000008', '22000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003');
-- Even a malformed administrator-created row is not visible to a freelancer.
insert into public.company_proposal_interactions (company_user_id, proposal_id, state)
values ('00000000-0000-4000-8000-000000000004', '22000000-0000-4000-8000-000000000002', 'saved');

create function pg_temp.fail_match_for_atomicity_test()
returns trigger language plpgsql as $$
begin
  if new.proposal_id = '22000000-0000-4000-8000-000000000010'::uuid then
    raise exception 'forced match failure';
  end if;
  return new;
end;
$$;
create trigger fail_match_for_atomicity_test
  before insert on public.matches for each row execute function pg_temp.fail_match_for_atomicity_test();

select throws_ok(
  $$insert into public.company_proposal_interactions (company_user_id, proposal_id, state) values ('00000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'unseen')$$,
  '23514', null, 'unseen cannot be stored in the table'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
select is((select count(*) from public.company_proposal_interactions), 0::bigint, 'a session without a user cannot read interactions');
select is((select count(*) from public.matches), 0::bigint, 'a session without a user cannot read matches');
select throws_ok('select * from public.list_my_matches()', '42501', 'not authenticated', 'a session without a user cannot list matches');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  public.set_proposal_interaction(('21000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid, next_state),
  expected_state, 'company transition case ' || case_no::text
) from company_transition_cases order by case_no;
select results_eq(
  $$select i.proposal_id::text, i.state from public.company_proposal_interactions i where i.proposal_id::text like '21000000-%' order by i.proposal_id$$,
  $$select '21000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'), expected_state from company_transition_cases where expected_state is not null order by case_no$$,
  'stored rows agree with the complete transition matrix'
);
select is(
  (select count(*) from public.company_proposal_interactions i join company_transition_cases c
   on i.proposal_id = ('21000000-0000-4000-8000-' || pg_catalog.lpad(c.case_no::text, 12, '0'))::uuid
   where c.current_state = c.expected_state and i.updated_at = '2001-01-01 00:00:00+00'::timestamptz),
  13::bigint, 'no-op transitions preserve their timestamps'
);
select is((select count(*) from public.matches where proposal_id::text like '21000000-%'), 6::bigint, 'only interested transitions create matches');
select is((select count(*) from public.matches where proposal_id in ('21000000-0000-4000-8000-000000000010', '21000000-0000-4000-8000-000000000015')), 0::bigint, 'saved or dismissed cannot jump directly to interested');
select set_config('test.existing_match', (select id::text from public.matches where proposal_id = '21000000-0000-4000-8000-000000000005'), true);
select is(public.set_proposal_interaction('21000000-0000-4000-8000-000000000005', 'interested'), 'interested', 'repeating interested is idempotent');
select is((select id::text from public.matches where proposal_id = '21000000-0000-4000-8000-000000000005'), current_setting('test.existing_match'), 'repeating interested preserves the same match id');
select set_config('test.preexisting_match', (select id::text from public.matches where proposal_id = '22000000-0000-4000-8000-000000000011'), true);
select is(public.set_proposal_interaction('22000000-0000-4000-8000-000000000011', 'interested'), 'interested', 'interest tolerates an existing match without an interaction row');
select is((select id::text from public.matches where proposal_id = '22000000-0000-4000-8000-000000000011'), current_setting('test.preexisting_match'), 'an existing match is reused without changing its id');

select is((select count(*) from public.list_problem_proposals('12000000-0000-4000-8000-000000000001')), 2::bigint, 'only submitted proposals are listed');
select results_eq(
  $$select id, price, currency from public.list_problem_proposals('12000000-0000-4000-8000-000000000001')$$,
  $$values ('22000000-0000-4000-8000-000000000001'::uuid, 999.99::numeric, 'USD'::text), ('22000000-0000-4000-8000-000000000002'::uuid, 5.25::numeric, 'PEN'::text)$$,
  'submission order and exact prices and currencies are preserved'
);
select ok((select freelancer_name = 'Autora Pública' and freelancer_slug is not null and headline = 'Titular público'
  and diagnosis = 'Diagnóstico A' and solution = 'Solución A' and deliverables = 'Entrega A'
  and timeline = 'Tres semanas' and recurring_costs = 'Costos A' and maintenance_warranty = 'Garantía A'
  and related_experience = 'Experiencia A' and my_state is null and match_id is null
  from public.list_problem_proposals('12000000-0000-4000-8000-000000000001') where id = '22000000-0000-4000-8000-000000000001'),
  'the owner sees all comparable fields and public profile details');
select ok((select freelancer_name = 'Autor Privado' and freelancer_slug is null and headline is null
  from public.list_problem_proposals('12000000-0000-4000-8000-000000000001') where id = '22000000-0000-4000-8000-000000000002'),
  'a private profile supplies its display name without its slug or private headline');
select throws_ok($$select * from public.list_problem_proposals('12000000-0000-4000-8000-000000000002')$$, '42501', 'problem not found', 'a company cannot list another company problem');
select throws_ok($$select * from public.list_problem_proposals('12000000-0000-4000-8000-000000000099')$$, '42501', 'problem not found', 'a nonexistent problem is rejected');
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000005', 'saved')$$, '42501', 'proposal not found', 'a company cannot interact with another company proposal');
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000099', 'saved')$$, '42501', 'proposal not found', 'a nonexistent proposal is rejected');
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000001', 'invalid')$$, '22023', 'invalid proposal interaction state', 'invalid transition values are rejected');
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000003', 'interested')$$, '22023', 'submitted proposal required', 'a proposal draft cannot be selected');
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000004', 'interested')$$, '22023', 'proposal withdrawn', 'a withdrawn proposal cannot be selected');
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000007', null)$$, '22023', 'open or paused problem required for interaction', 'a closed problem rejects even undo');
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000008', 'saved')$$, '22023', 'open or paused problem required for interaction', 'a draft problem rejects interactions');
select is(public.set_proposal_interaction('22000000-0000-4000-8000-000000000006', 'saved'), 'saved', 'a paused problem accepts interactions');
select is(public.set_proposal_interaction('22000000-0000-4000-8000-000000000002', 'saved'), 'saved', 'a company can privately save a proposal');
select is((select my_state from public.list_problem_proposals('12000000-0000-4000-8000-000000000001') where id = '22000000-0000-4000-8000-000000000002'), 'saved', 'the owner sees their own saved state in the inbox');
select is(public.set_proposal_interaction('22000000-0000-4000-8000-000000000001', 'interested'), 'interested', 'interest creates a match for a submitted proposal');
select is((select count(*) from public.matches where proposal_id = '22000000-0000-4000-8000-000000000001'), 1::bigint, 'one match exists for the proposal');
select is((select match_id from public.list_problem_proposals('12000000-0000-4000-8000-000000000001') where id = '22000000-0000-4000-8000-000000000001'),
  (select id from public.matches where proposal_id = '22000000-0000-4000-8000-000000000001'), 'the inbox returns the existing match id');
select ok((select counterpart_name = 'Autora Pública' and problem_title = 'Problema visible' from public.list_my_matches() where proposal_id = '22000000-0000-4000-8000-000000000001'), 'the company match list includes only the permitted counterpart and title');
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000010', 'interested')$$, 'P0001', 'forced match failure', 'a failed match insert aborts the interaction');
select is((select count(*) from public.company_proposal_interactions where proposal_id = '22000000-0000-4000-8000-000000000010'), 0::bigint, 'the interaction rolls back when creating the match fails');
select is((select count(*) from public.matches where proposal_id = '22000000-0000-4000-8000-000000000010'), 0::bigint, 'a failed match leaves no match row');
select throws_ok($$insert into public.company_proposal_interactions (company_user_id, proposal_id, state) values (auth.uid(), '22000000-0000-4000-8000-000000000001', 'saved')$$, '42501', null, 'a company cannot insert interactions directly');
select throws_ok($$update public.company_proposal_interactions set state = 'saved'$$, '42501', null, 'a company cannot update interactions directly');
select throws_ok('delete from public.company_proposal_interactions', '42501', null, 'a company cannot delete interactions directly');
select throws_ok($$insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id) values (null, null, null, null)$$, '42501', null, 'a company cannot insert matches directly');
select throws_ok($$update public.matches set status = 'matched'$$, '42501', null, 'a company cannot update matches directly');
select throws_ok('delete from public.matches', '42501', null, 'a company cannot delete matches directly');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.company_proposal_interactions), 0::bigint, 'the proposal author cannot see company interaction states');
select is((select count(*) from public.matches where proposal_id = '22000000-0000-4000-8000-000000000001'), 1::bigint, 'the matched freelancer can read their match');
select ok((select counterpart_name = 'Empresa Visible' and problem_title = 'Problema visible' from public.list_my_matches() where proposal_id = '22000000-0000-4000-8000-000000000001'), 'the freelancer can list the visible company name and problem title');
select is((select counterpart_name from public.list_my_matches() where proposal_id = '21000000-0000-4000-8000-000000000005'), null::text, 'a hidden company name stays private after a match');
select throws_ok($$select * from public.list_problem_proposals('12000000-0000-4000-8000-000000000001')$$, '42501', 'company account required', 'a freelancer cannot list the company inbox');
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000001', 'saved')$$, '42501', 'company account required', 'a freelancer cannot change company states');
select throws_ok($$select public.withdraw_proposal('22000000-0000-4000-8000-000000000001')$$, '22023', 'proposal already matched', 'a matched proposal cannot be withdrawn');
select is(public.withdraw_proposal('22000000-0000-4000-8000-000000000009'), '22000000-0000-4000-8000-000000000009'::uuid, 'an unmatched proposal can be withdrawn');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.company_proposal_interactions), 0::bigint, 'another freelancer cannot see favorites, even a malformed own row');
select is((select count(*) from public.matches), 0::bigint, 'another freelancer cannot read someone else’s matches');
select is((select count(*) from public.list_my_matches()), 0::bigint, 'another freelancer cannot list someone else’s matches');
select throws_ok($$select public.withdraw_proposal('22000000-0000-4000-8000-000000000001')$$, '42501', 'proposal not found', 'another freelancer cannot withdraw the matched proposal');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.company_proposal_interactions), 0::bigint, 'another company cannot read the owner interactions');
select is((select count(*) from public.matches), 0::bigint, 'another company cannot read the owner matches');
select throws_ok($$select * from public.list_problem_proposals('12000000-0000-4000-8000-000000000001')$$, '42501', 'problem not found', 'another company cannot list the owner inbox');
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000001', 'interested')$$, '42501', 'proposal not found', 'another company cannot match the owner proposal');
select is(public.set_proposal_interaction('22000000-0000-4000-8000-000000000005', 'interested'), 'interested', 'another company can create its own match');
select is((select count(*) from public.list_my_matches()), 1::bigint, 'another company lists only its own match');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.matches), 1::bigint, 'the other freelancer can read their own match and no others');
select is((select proposal_id from public.list_my_matches()), '22000000-0000-4000-8000-000000000005'::uuid, 'the other freelancer lists only their own match');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$select public.set_proposal_interaction('22000000-0000-4000-8000-000000000009', 'interested')$$, '22023', 'proposal withdrawn', 'interest is rejected if the author withdrew in the meantime');
select is((select count(*) from public.matches where proposal_id = '22000000-0000-4000-8000-000000000009'), 0::bigint, 'a withdrawn proposal has no match');
select is((select count(*) from public.matches where proposal_id = '22000000-0000-4000-8000-000000000005'), 0::bigint, 'the original company cannot see another company match');

select * from finish();
rollback;
