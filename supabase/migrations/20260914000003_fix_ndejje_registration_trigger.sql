-- Keep the deployed trigger aligned with the flexible student-number rule.

create or replace function public.validate_ndejje_student_profile()
returns trigger
language plpgsql
as $$
begin
  if new.university = 'Ndejje University'
     and new.student_registration_number is not null
     and new.student_registration_number !~ '^[0-9]{2}/[12]/[0-9]{3}/D/[0-9]+$' then
    raise exception 'Ndejje University registration number must match 00/0/000/D/0000';
  end if;
  return new;
end;
$$;