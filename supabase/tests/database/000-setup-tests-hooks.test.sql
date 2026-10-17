create extension if not exists pgtap with schema extensions;

begin;

select plan(1);
select ok(
  exists (select 1 from pg_catalog.pg_extension where extname = 'pgtap'),
  'pgTAP is enabled before the database policy tests run'
);
select * from finish();

rollback;
