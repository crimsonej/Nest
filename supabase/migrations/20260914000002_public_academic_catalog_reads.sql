-- Signup must be able to read active academic options before authentication.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'faculties'
      and policyname = 'Public can read active faculties'
  ) then
    create policy "Public can read active faculties"
      on public.faculties for select
      to anon, authenticated
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'Public can read active courses'
  ) then
    create policy "Public can read active courses"
      on public.courses for select
      to anon, authenticated
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'course_units'
      and policyname = 'Public can read active course units'
  ) then
    create policy "Public can read active course units"
      on public.course_units for select
      to anon, authenticated
      using (is_active = true);
  end if;
end;
$$;