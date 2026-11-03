begin;

-- Both matrices are shared with apps/web/lib/interaction-transitions.test.ts. SQL NULL means unseen.
create temporary table interaction_transition_cases (
  case_no integer primary key,
  current_state text,
  next_state text,
  expected_state text
);
-- BEGIN FREELANCER TRANSITION CASES
insert into interaction_transition_cases (case_no, current_state, next_state, expected_state) values
  (1, null, null, null),
  (2, null, 'saved', 'saved'),
  (3, null, 'dismissed', 'dismissed'),
  (4, null, 'proposal_submitted', 'proposal_submitted'),
  (5, 'saved', null, null),
  (6, 'saved', 'saved', 'saved'),
  (7, 'saved', 'dismissed', 'saved'),
  (8, 'saved', 'proposal_submitted', 'proposal_submitted'),
  (9, 'dismissed', null, null),
  (10, 'dismissed', 'saved', 'dismissed'),
  (11, 'dismissed', 'dismissed', 'dismissed'),
  (12, 'dismissed', 'proposal_submitted', 'dismissed'),
  (13, 'proposal_submitted', null, 'proposal_submitted'),
  (14, 'proposal_submitted', 'saved', 'proposal_submitted'),
  (15, 'proposal_submitted', 'dismissed', 'proposal_submitted'),
  (16, 'proposal_submitted', 'proposal_submitted', 'proposal_submitted');
-- END FREELANCER TRANSITION CASES

create temporary table interaction_withdraw_cases (
  case_no integer primary key,
  current_state text,
  has_other_active boolean not null,
  expected_state text
);
-- BEGIN FREELANCER WITHDRAW CASES
insert into interaction_withdraw_cases (case_no, current_state, has_other_active, expected_state) values
  (1, null, false, null),
  (2, null, true, null),
  (3, 'saved', false, 'saved'),
  (4, 'saved', true, 'saved'),
  (5, 'dismissed', false, 'dismissed'),
  (6, 'dismissed', true, 'dismissed'),
  (7, 'proposal_submitted', false, 'saved'),
  (8, 'proposal_submitted', true, 'proposal_submitted');
-- END FREELANCER WITHDRAW CASES

select plan(16 + 51 + 19);
grant select on interaction_transition_cases to authenticated;
grant select on interaction_withdraw_cases to authenticated;

-- Force a failure after the proposal update to verify that the entire RPC rolls back.
create function pg_temp.fail_interaction_for_atomicity_test()
returns trigger language plpgsql as $$
begin
  if new.problem_id = '12000000-0000-4000-8000-000000000005'::uuid then
    raise exception 'forced interaction failure';
  end if;
  return new;
end;
$$;

set local role anon;
select throws_ok('select * from public.freelancer_problem_interactions', '42501', null, 'anonymous users cannot read interactions');
select throws_ok(
  $$insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state) values (null, null, 'saved')$$,
  '42501', null, 'anonymous users cannot insert interactions'
);
select throws_ok('update public.freelancer_problem_interactions set state = ''saved''', '42501', null, 'anonymous users cannot update interactions');
select throws_ok('delete from public.freelancer_problem_interactions', '42501', null, 'anonymous users cannot delete interactions');
select throws_ok($$select public.set_problem_interaction(null, 'saved')$$, '42501', null, 'anonymous users cannot invoke the transition RPC');
select throws_ok('select * from public.list_my_problem_interactions()', '42501', null, 'anonymous users cannot list interactions via RPC');
reset role;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'interaction-company@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa","role":"company"}'),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'interaction-author@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Autora","role":"freelancer"}'),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'interaction-other@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Otro profesional","role":"freelancer"}');

insert into public.business_problems (id, company_user_id, status)
select ('11000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001', 'open'::public.business_problem_status
from interaction_transition_cases;
insert into public.business_problems (id, company_user_id, status) values
  ('12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'open'),
  ('12000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'open'),
  ('12000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'open'),
  ('12000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'open'),
  ('12000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'open'),
  ('12000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'paused'),
  ('12000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', 'closed'),
  ('12000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', 'draft');

insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state, created_at, updated_at)
select '00000000-0000-4000-8000-000000000003',
  ('11000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  current_state, '2001-01-01 00:00:00+00', '2001-01-01 00:00:00+00'
from interaction_transition_cases where current_state is not null;
-- Even an administrator-created company-owned row is hidden from a company.
insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state) values
  ('00000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'saved'),
  ('00000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000006', 'saved'),
  ('00000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000007', 'dismissed'),
  ('00000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000008', 'proposal_submitted');
create trigger fail_interaction_for_atomicity_test
  before insert on public.freelancer_problem_interactions
  for each row execute function pg_temp.fail_interaction_for_atomicity_test();
select throws_ok(
  $$insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state) values ('00000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000001', 'unseen')$$,
  '23514', null, 'unseen cannot be stored even by a privileged writer'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
select is((select count(*) from public.freelancer_problem_interactions), 0::bigint, 'a session without a user cannot read interactions');
select throws_ok($$select public.set_problem_interaction(null, null)$$, '42501', null, 'a session without a user cannot transition');
select throws_ok('select * from public.list_my_problem_interactions()', '42501', null, 'a session without a user cannot list');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  public.set_problem_interaction(('11000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid, next_state),
  expected_state,
  'transition case ' || case_no::text
)
from interaction_transition_cases order by case_no;

select results_eq(
  $$select i.problem_id::text, i.state from public.freelancer_problem_interactions i where i.problem_id::text like '11000000-%' order by i.problem_id$$,
  $$select '11000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'), expected_state from interaction_transition_cases where expected_state is not null order by case_no$$,
  'all transition results match the rows that were actually stored'
);
select is(
  (select count(*) from public.freelancer_problem_interactions i
   join interaction_transition_cases c on i.problem_id = ('11000000-0000-4000-8000-' || pg_catalog.lpad(c.case_no::text, 12, '0'))::uuid
   where c.current_state = c.expected_state and i.updated_at = '2001-01-01 00:00:00+00'::timestamptz),
  9::bigint, 'no-op transitions preserve their timestamps'
);
select is(
  (select created_at from public.freelancer_problem_interactions where problem_id = '11000000-0000-4000-8000-000000000008'),
  '2001-01-01 00:00:00+00'::timestamptz, 'a saved to submitted transition preserves creation time'
);
select ok(
  (select updated_at > '2001-01-01 00:00:00+00'::timestamptz from public.freelancer_problem_interactions where problem_id = '11000000-0000-4000-8000-000000000008'),
  'a saved to submitted transition updates its timestamp'
);
select results_eq(
  $$select problem_id, state, updated_at from public.list_my_problem_interactions() order by problem_id$$,
  $$select problem_id, state, updated_at from public.freelancer_problem_interactions order by problem_id$$,
  'the list RPC returns only the author rows with their timestamps'
);
select throws_ok(
  $$insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state) values (auth.uid(), '12000000-0000-4000-8000-000000000001', 'saved')$$,
  '42501', null, 'the author cannot insert interaction rows directly'
);
select throws_ok('update public.freelancer_problem_interactions set state = ''saved''', '42501', null, 'the author cannot update interaction rows directly');
select throws_ok('delete from public.freelancer_problem_interactions', '42501', null, 'the author cannot delete interaction rows directly');
select throws_ok($$select public.set_problem_interaction('12000000-0000-4000-8000-000000000001', 'unseen')$$, '22023', 'invalid problem interaction state', 'unseen is not accepted as an RPC state');
select throws_ok($$select public.set_problem_interaction('12000000-0000-4000-8000-000000000001', 'invalid')$$, '22023', 'invalid problem interaction state', 'unknown RPC states are rejected');
select throws_ok($$select public.set_problem_interaction('12000000-0000-4000-8000-000000000006', 'saved')$$, '22023', 'open problem required for interaction', 'a paused problem rejects saved even as a no-op');
select throws_ok($$select public.set_problem_interaction('12000000-0000-4000-8000-000000000007', 'dismissed')$$, '22023', 'open problem required for interaction', 'a closed problem rejects dismissed');
select throws_ok($$select public.set_problem_interaction('12000000-0000-4000-8000-000000000008', 'proposal_submitted')$$, '22023', 'open problem required for interaction', 'a draft problem rejects submitted');
select throws_ok($$select public.set_problem_interaction('12000000-0000-4000-8000-000000000099', 'saved')$$, '22023', 'open problem required for interaction', 'a missing problem rejects interactions');
select is(public.set_problem_interaction('12000000-0000-4000-8000-000000000006', null), null::text, 'saved can be undone while paused');
select is(public.set_problem_interaction('12000000-0000-4000-8000-000000000007', null), null::text, 'dismissed can be undone while closed');
select is(public.set_problem_interaction('12000000-0000-4000-8000-000000000008', null), 'proposal_submitted', 'submitted remains unchanged when undoing a draft problem');
select is(public.set_problem_interaction('12000000-0000-4000-8000-000000000099', null), null::text, 'undoing a missing problem is a no-op');
select is((select count(*) from public.freelancer_problem_interactions where problem_id in ('12000000-0000-4000-8000-000000000006', '12000000-0000-4000-8000-000000000007')), 0::bigint, 'undo actually removes saved and dismissed rows');

select set_config('test.empty_proposal', public.save_proposal_draft('12000000-0000-4000-8000-000000000001', '{"diagnosis":"Diagnóstico","solution":"Solución","deliverables":"Entrega","timeline":"Una semana","price":200}'::jsonb)::text, true);
select is(public.submit_proposal(current_setting('test.empty_proposal')::uuid)::text, current_setting('test.empty_proposal'), 'a complete proposal can be submitted without an interaction');
select is((select state from public.freelancer_problem_interactions where problem_id = '12000000-0000-4000-8000-000000000001'), 'proposal_submitted', 'submission creates an interaction');
select is(public.set_problem_interaction('12000000-0000-4000-8000-000000000002', 'saved'), 'saved', 'a problem can be saved before submitting');
select set_config('test.saved_proposal', public.save_proposal_draft('12000000-0000-4000-8000-000000000002', '{"diagnosis":"Diagnóstico","solution":"Solución","deliverables":"Entrega","timeline":"Una semana","price":200}'::jsonb)::text, true);
select is(public.submit_proposal(current_setting('test.saved_proposal')::uuid)::text, current_setting('test.saved_proposal'), 'a proposal can be submitted for a saved problem');
select is((select state from public.freelancer_problem_interactions where problem_id = '12000000-0000-4000-8000-000000000002'), 'proposal_submitted', 'submission advances saved to submitted');
select is(public.set_problem_interaction('12000000-0000-4000-8000-000000000003', 'dismissed'), 'dismissed', 'a problem can be dismissed before submitting');
select set_config('test.dismissed_proposal', public.save_proposal_draft('12000000-0000-4000-8000-000000000003', '{"diagnosis":"Diagnóstico","solution":"Solución","deliverables":"Entrega","timeline":"Una semana","price":200}'::jsonb)::text, true);
select is(public.submit_proposal(current_setting('test.dismissed_proposal')::uuid)::text, current_setting('test.dismissed_proposal'), 'a proposal can be submitted for a dismissed problem');
select is((select state from public.freelancer_problem_interactions where problem_id = '12000000-0000-4000-8000-000000000003'), 'dismissed', 'submission does not change dismissed');
select is(public.withdraw_proposal(current_setting('test.empty_proposal')::uuid)::text, current_setting('test.empty_proposal'), 'a submitted proposal can be withdrawn');
select is((select state from public.freelancer_problem_interactions where problem_id = '12000000-0000-4000-8000-000000000001'), 'saved', 'withdrawing restores a submitted interaction to saved');
select set_config('test.incomplete_proposal', public.save_proposal_draft('12000000-0000-4000-8000-000000000004', '{}'::jsonb)::text, true);
select throws_ok($$select public.submit_proposal(current_setting('test.incomplete_proposal')::uuid)$$, '22023', null, 'an incomplete proposal cannot be submitted');
select is((select count(*) from public.freelancer_problem_interactions where problem_id = '12000000-0000-4000-8000-000000000004'), 0::bigint, 'a failed submission creates no interaction');
select set_config('test.atomic_proposal', public.save_proposal_draft('12000000-0000-4000-8000-000000000005', '{"diagnosis":"Diagnóstico","solution":"Solución","deliverables":"Entrega","timeline":"Una semana","price":200}'::jsonb)::text, true);
select throws_ok($$select public.submit_proposal(current_setting('test.atomic_proposal')::uuid)$$, 'P0001', 'forced interaction failure', 'an interaction failure aborts submission');
select is((select status from public.proposals where id = current_setting('test.atomic_proposal')::uuid), 'draft', 'an interaction failure rolls the proposal back to draft');
select is((select count(*) from public.freelancer_problem_interactions where problem_id = '12000000-0000-4000-8000-000000000005'), 0::bigint, 'an interaction failure leaves no interaction row');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.freelancer_problem_interactions), 0::bigint, 'another freelancer cannot read the author interactions');
select is((select count(*) from public.list_my_problem_interactions()), 0::bigint, 'another freelancer cannot list the author interactions');
select is(public.set_problem_interaction('12000000-0000-4000-8000-000000000001', 'dismissed'), 'dismissed', 'another freelancer has an independent interaction');
select is((select count(*) from public.freelancer_problem_interactions), 1::bigint, 'another freelancer reads only their own row');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.freelancer_problem_interactions), 0::bigint, 'a company cannot read interactions even for its own problem or an own row');
select throws_ok($$select public.set_problem_interaction('12000000-0000-4000-8000-000000000001', 'saved')$$, '42501', 'freelancer account required', 'a company cannot transition interactions');
select throws_ok('select * from public.list_my_problem_interactions()', '42501', 'freelancer account required', 'a company cannot list interactions');

reset role;
-- The production index forbids another active proposal. Temporarily remove it
-- inside this rolled-back test to exercise the defensive branch for legacy data.
drop index public.proposals_one_active_per_problem_freelancer_idx;
insert into public.business_problems (id, company_user_id, status, title)
select ('13000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001', 'open'::public.business_problem_status, 'Problema de prueba'
from interaction_withdraw_cases;
insert into public.proposals (id, problem_id, problem_title_snapshot, freelancer_id, status, submitted_at)
select ('23000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  ('13000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  'Problema de prueba', '00000000-0000-4000-8000-000000000003', 'submitted', now()
from interaction_withdraw_cases;
insert into public.proposals (problem_id, problem_title_snapshot, freelancer_id, status, submitted_at)
select ('13000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  'Problema de prueba', '00000000-0000-4000-8000-000000000003',
  case when case_no in (4, 8) then 'submitted' else 'draft' end,
  case when case_no in (4, 8) then now() else null end
from interaction_withdraw_cases where has_other_active;
insert into public.freelancer_problem_interactions (freelancer_id, problem_id, state, created_at, updated_at)
select '00000000-0000-4000-8000-000000000003',
  ('13000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  current_state, '2001-01-01 00:00:00+00', '2001-01-01 00:00:00+00'
from interaction_withdraw_cases where current_state is not null;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  public.withdraw_proposal(('23000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid),
  ('23000000-0000-4000-8000-' || pg_catalog.lpad(case_no::text, 12, '0'))::uuid,
  'withdrawal succeeds for case ' || case_no::text
)
from interaction_withdraw_cases order by case_no;
select is(
  (select i.state from public.freelancer_problem_interactions i
   where i.problem_id = ('13000000-0000-4000-8000-' || pg_catalog.lpad(c.case_no::text, 12, '0'))::uuid),
  c.expected_state, 'withdrawal interaction case ' || c.case_no::text
)
from interaction_withdraw_cases c order by c.case_no;
select is((select count(*) from public.proposals where problem_id::text like '13000000-%' and status <> 'withdrawn'), 4::bigint, 'other active proposals remain unchanged');
select is((select count(*) from public.proposals where problem_id::text like '13000000-%' and status = 'submitted'), 2::bigint, 'other submitted proposals remain active');
select is((select count(*) from public.freelancer_problem_interactions where problem_id::text like '13000000-%' and updated_at = '2001-01-01 00:00:00+00'::timestamptz), 5::bigint, 'no-op withdrawals preserve interaction timestamps');
reset role;
create unique index proposals_one_active_per_problem_freelancer_idx
  on public.proposals (problem_id, freelancer_id) where status <> 'withdrawn';

select * from finish();
rollback;
