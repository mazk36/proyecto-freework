-- Public aggregates only. Clients should cache successful responses for about 60 seconds.
create or replace function public.get_public_counters()
returns table (
  open_problems bigint,
  companies_published bigint,
  freelancers_active bigint,
  proposals_submitted bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.business_problems p where p.status = 'open'),
    (select count(distinct p.company_user_id)
       from public.business_problems p where p.status in ('open', 'paused', 'closed')),
    -- "Active" is conservative: an explicitly public freelancer profile that has a headline.
    -- It does not claim recent login, activity, or availability.
    (select count(*) from public.profiles p
       join public.freelancer_profiles f on f.user_id = p.id
       where p.account_type = 'freelancer' and p.is_public
         and pg_catalog.btrim(coalesce(f.headline, '')) <> ''),
    (select count(*) from public.proposals p where p.status = 'submitted');
$$;

revoke all on function public.get_public_counters() from public, anon, authenticated;
grant execute on function public.get_public_counters() to anon, authenticated;

comment on function public.get_public_counters() is
  'Read-only public totals; freelancer activity means a public profile with a headline, not recent activity. Cache responses client-side for about 60 seconds.';
