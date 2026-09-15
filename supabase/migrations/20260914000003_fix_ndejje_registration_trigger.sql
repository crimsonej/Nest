-- Keep the deployed trigger aligned with the flexible student-number rule.

create or replace function public.validate_ndejje_student_profile()
returns trigger
language plpgsql
as $$
begin
  if new.university = 'Ndejje University'
     and new.student_registration_number is not null
    and new.student_registration_number !~ '^[0-9]{2}/[12]/[0-9]{3}/[A-Za-z]/[0-9]+$' then
      raise exception 'Ndejje University registration number must match 00/0/000/A/0000 or similar Ndejje format';
  end if;
  return new;
end;
$$;