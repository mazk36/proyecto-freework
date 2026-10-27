alter table public.portfolio_projects
  add column skills_used text[] not null default '{}'::text[]
  check (pg_catalog.cardinality(skills_used) <= 20);

grant select (skills_used)
  on table public.portfolio_projects to anon, authenticated;
grant insert (skills_used)
  on table public.portfolio_projects to authenticated;
grant update (skills_used)
  on table public.portfolio_projects to authenticated;
