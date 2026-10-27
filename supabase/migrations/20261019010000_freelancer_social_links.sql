alter table public.freelancer_profiles
  add column linkedin_url text check (
    linkedin_url is null or (
      char_length(linkedin_url) <= 2048
      and linkedin_url ~* '^https?://([a-z0-9-]+\.)*linkedin\.com(/[^[:space:]]*)?$'
    )
  ),
  add column github_url text check (
    github_url is null or (
      char_length(github_url) <= 2048
      and github_url ~* '^https?://([a-z0-9-]+\.)*github\.com(/[^[:space:]]*)?$'
    )
  );

grant select (linkedin_url, github_url)
  on table public.freelancer_profiles to anon, authenticated;
grant insert (linkedin_url, github_url)
  on table public.freelancer_profiles to authenticated;
grant update (linkedin_url, github_url)
  on table public.freelancer_profiles to authenticated;
