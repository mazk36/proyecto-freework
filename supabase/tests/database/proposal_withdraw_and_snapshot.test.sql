begin;

select plan(34);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('07000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'snapshot-company@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Empresa","role":"company"}'),
  ('07000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'snapshot-author@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Autora","role":"freelancer"}'),
  ('07000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'snapshot-other@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Otro profesional","role":"freelancer"}');

insert into public.business_problems (id, company_user_id, status, title) values
  ('17000000-0000-4000-8000-000000000001', '07000000-0000-4000-8000-000000000001', 'open', 'Título original del problema'),
  ('17000000-0000-4000-8000-000000000002', '07000000-0000-4000-8000-000000000001', 'open', 'Borrador sin interacción'),
  ('17000000-0000-4000-8000-000000000003', '07000000-0000-4000-8000-000000000001', 'open', 'Problema con Match'),
  ('17000000-0000-4000-8000-000000000004', '07000000-0000-4000-8000-000000000001', 'open', 'Prueba de atomicidad'),
  ('17000000-0000-4000-8000-000000000005', '07000000-0000-4000-8000-000000000001', 'open', 'Prueba del límite'),
  ('17000000-0000-4000-8000-000000000006', '07000000-0000-4000-8000-000000000001', 'open', 'Problema pausado'),
  ('17000000-0000-4000-8000-000000000007', '07000000-0000-4000-8000-000000000001', 'open', 'Problema cerrado');

set local role authenticated;
select set_config('request.jwt.claim.sub', '07000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"07000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select set_config('test.snapshot_proposal', public.save_proposal_draft(
  '17000000-0000-4000-8000-000000000001',
  '{"diagnosis":"Diagnóstico","solution":"Solución","deliverables":"Entrega","timeline":"Una semana","price":200}'::jsonb
)::text, true);
select is((select problem_title_snapshot from public.proposals where id = current_setting('test.snapshot_proposal')::uuid), 'Título original del problema', 'a new draft stores the open problem title');
select throws_ok(
  $$select public.save_proposal_draft('17000000-0000-4000-8000-000000000001', '{"problem_title_snapshot":"Título falso"}'::jsonb)$$,
  '22023', 'invalid proposal data', 'clients cannot supply a snapshot when creating a draft'
);

reset role;
update public.business_problems set title = 'Título actualizado del problema' where id = '17000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select problem_title_snapshot from public.proposals where id = current_setting('test.snapshot_proposal')::uuid), 'Título original del problema', 'changing the problem title preserves the snapshot');
select is(public.save_proposal_draft(
  '17000000-0000-4000-8000-000000000001',
  pg_catalog.jsonb_build_object('id', current_setting('test.snapshot_proposal'), 'solution', 'Solución editada')
)::text, current_setting('test.snapshot_proposal'), 'the author can edit the existing draft');
select is((select problem_title_snapshot from public.proposals where id = current_setting('test.snapshot_proposal')::uuid), 'Título original del problema', 'editing the draft does not replace the snapshot');
select throws_ok(
  $$select public.save_proposal_draft('17000000-0000-4000-8000-000000000001', pg_catalog.jsonb_build_object('id', current_setting('test.snapshot_proposal'), 'problem_title_snapshot', 'Falso'))$$,
  '22023', 'invalid proposal data', 'clients cannot supply a snapshot when editing a draft'
);
select throws_ok(
  $$update public.proposals set problem_title_snapshot = 'Falso' where id = current_setting('test.snapshot_proposal')::uuid$$,
  '42501', null, 'the author cannot update the snapshot directly'
);

reset role;
select throws_ok(
  $$update public.proposals set problem_title_snapshot = 'Falso' where id = current_setting('test.snapshot_proposal')::uuid$$,
  '22023', 'proposal problem title snapshot cannot be changed', 'the trigger rejects even a privileged direct update'
);
select lives_ok(
  $$update public.proposals set problem_title_snapshot = problem_title_snapshot where id = current_setting('test.snapshot_proposal')::uuid$$,
  'the trigger permits an update that preserves the snapshot'
);
select throws_ok(
  $$insert into public.proposals (problem_id, freelancer_id) values ('17000000-0000-4000-8000-000000000005', '07000000-0000-4000-8000-000000000002')$$,
  '23502', null, 'new proposals require a snapshot'
);
select throws_ok(
  $$insert into public.proposals (problem_id, freelancer_id, problem_title_snapshot) values ('17000000-0000-4000-8000-000000000005', '07000000-0000-4000-8000-000000000002', pg_catalog.repeat('😀', 201))$$,
  '23514', null, 'a snapshot longer than 200 characters is rejected'
);
select lives_ok(
  $$insert into public.proposals (problem_id, freelancer_id, problem_title_snapshot) values ('17000000-0000-4000-8000-000000000005', '07000000-0000-4000-8000-000000000002', pg_catalog.repeat('😀', 200))$$,
  'a snapshot of 200 Unicode characters is accepted'
);

set local role authenticated;
select is(public.submit_proposal(current_setting('test.snapshot_proposal')::uuid)::text, current_setting('test.snapshot_proposal'), 'the edited proposal can be submitted');
select is(public.set_problem_interaction('17000000-0000-4000-8000-000000000001', 'saved'), 'proposal_submitted', 'the interaction RPC still refuses submitted to saved');
select is((select state from public.freelancer_problem_interactions where problem_id = '17000000-0000-4000-8000-000000000001'), 'proposal_submitted', 'the refused transition does not change the stored state');

select set_config('request.jwt.claim.sub', '07000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"07000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select problem_title_snapshot from public.proposals where id = current_setting('test.snapshot_proposal')::uuid), 'Título original del problema', 'the owner company can read the snapshot of a submitted proposal');

select set_config('request.jwt.claim.sub', '07000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"07000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select set_config('test.other_draft', public.save_proposal_draft('17000000-0000-4000-8000-000000000001', '{}'::jsonb)::text, true);
select set_config('request.jwt.claim.sub', '07000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"07000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(public.withdraw_proposal(current_setting('test.snapshot_proposal')::uuid)::text, current_setting('test.snapshot_proposal'), 'the submitted proposal can be withdrawn');
select is((select status from public.proposals where id = current_setting('test.snapshot_proposal')::uuid), 'withdrawn', 'the withdrawn proposal remains in history');
select is((select state from public.freelancer_problem_interactions where problem_id = '17000000-0000-4000-8000-000000000001'), 'saved', 'withdrawal restores saved even if another freelancer has an active proposal');
select set_config('test.new_draft', public.save_proposal_draft('17000000-0000-4000-8000-000000000001', '{}'::jsonb)::text, true);
select is((select problem_title_snapshot from public.proposals where id = current_setting('test.new_draft')::uuid), 'Título actualizado del problema', 'a new draft after withdrawal captures the current title');
select is(public.withdraw_proposal(current_setting('test.new_draft')::uuid)::text, current_setting('test.new_draft'), 'the new draft can be withdrawn');
select is((select state from public.freelancer_problem_interactions where problem_id = '17000000-0000-4000-8000-000000000001'), 'saved', 'withdrawing a draft preserves an existing saved interaction');
select set_config('test.empty_draft', public.save_proposal_draft('17000000-0000-4000-8000-000000000002', '{}'::jsonb)::text, true);
select is(public.withdraw_proposal(current_setting('test.empty_draft')::uuid)::text, current_setting('test.empty_draft'), 'a draft without an interaction can be withdrawn');
select is((select count(*) from public.freelancer_problem_interactions where problem_id = '17000000-0000-4000-8000-000000000002'), 0::bigint, 'withdrawing the draft does not create an interaction');

select set_config('test.paused_proposal', public.save_proposal_draft(
  '17000000-0000-4000-8000-000000000006',
  '{"diagnosis":"Diagnóstico","solution":"Solución","deliverables":"Entrega","timeline":"Una semana","price":200}'::jsonb
)::text, true);
select public.submit_proposal(current_setting('test.paused_proposal')::uuid);
select set_config('test.closed_proposal', public.save_proposal_draft(
  '17000000-0000-4000-8000-000000000007',
  '{"diagnosis":"Diagnóstico","solution":"Solución","deliverables":"Entrega","timeline":"Una semana","price":200}'::jsonb
)::text, true);
select public.submit_proposal(current_setting('test.closed_proposal')::uuid);
reset role;
update public.business_problems set status = 'paused' where id = '17000000-0000-4000-8000-000000000006';
update public.business_problems set status = 'closed' where id = '17000000-0000-4000-8000-000000000007';
set local role authenticated;
select is(public.withdraw_proposal(current_setting('test.paused_proposal')::uuid)::text, current_setting('test.paused_proposal'), 'withdrawal remains available for a paused problem');
select is((select state from public.freelancer_problem_interactions where problem_id = '17000000-0000-4000-8000-000000000006'), 'saved', 'withdrawing while paused restores saved');
select is(public.withdraw_proposal(current_setting('test.closed_proposal')::uuid)::text, current_setting('test.closed_proposal'), 'withdrawal remains available for a closed problem');
select is((select state from public.freelancer_problem_interactions where problem_id = '17000000-0000-4000-8000-000000000007'), 'saved', 'withdrawing while closed restores saved');

select set_config('test.matched_proposal', public.save_proposal_draft(
  '17000000-0000-4000-8000-000000000003',
  '{"diagnosis":"Diagnóstico","solution":"Solución","deliverables":"Entrega","timeline":"Una semana","price":200}'::jsonb
)::text, true);
select public.submit_proposal(current_setting('test.matched_proposal')::uuid);
reset role;
insert into public.matches (problem_id, proposal_id, company_user_id, freelancer_id)
values ('17000000-0000-4000-8000-000000000003', current_setting('test.matched_proposal')::uuid,
  '07000000-0000-4000-8000-000000000001', '07000000-0000-4000-8000-000000000002');
set local role authenticated;
select throws_ok($$select public.withdraw_proposal(current_setting('test.matched_proposal')::uuid)$$, '22023', 'proposal already matched', 'a proposal with a Match cannot be withdrawn');
select is((select status from public.proposals where id = current_setting('test.matched_proposal')::uuid), 'submitted', 'the matched proposal remains submitted');
select is((select state from public.freelancer_problem_interactions where problem_id = '17000000-0000-4000-8000-000000000003'), 'proposal_submitted', 'the matched interaction remains submitted');

select set_config('test.atomic_withdrawal', public.save_proposal_draft(
  '17000000-0000-4000-8000-000000000004',
  '{"diagnosis":"Diagnóstico","solution":"Solución","deliverables":"Entrega","timeline":"Una semana","price":200}'::jsonb
)::text, true);
select public.submit_proposal(current_setting('test.atomic_withdrawal')::uuid);
reset role;
create function pg_temp.fail_withdraw_interaction()
returns trigger language plpgsql as $$
begin
  if new.problem_id = '17000000-0000-4000-8000-000000000004'::uuid then
    raise exception 'forced withdrawal interaction failure';
  end if;
  return new;
end;
$$;
create trigger fail_withdraw_interaction before update on public.freelancer_problem_interactions
  for each row execute function pg_temp.fail_withdraw_interaction();
set local role authenticated;
select throws_ok($$select public.withdraw_proposal(current_setting('test.atomic_withdrawal')::uuid)$$, 'P0001', 'forced withdrawal interaction failure', 'an interaction failure aborts withdrawal');
select is((select status from public.proposals where id = current_setting('test.atomic_withdrawal')::uuid), 'submitted', 'an interaction failure rolls back the proposal status');
select is((select state from public.freelancer_problem_interactions where problem_id = '17000000-0000-4000-8000-000000000004'), 'proposal_submitted', 'an interaction failure preserves the interaction');

select * from finish();
rollback;
