-- Update Ndejje registration number pattern and trigger validation rule
-- to accept formats like 26/1/222/BSCS/1234, 21/2/101/BIT/5, 26/2/222/D/2222.

update public.universities
set accepted_reg_number_pattern = '^[0-9]{2}/[0-9]+/[0-9]{3,4}/[A-Za-z]+/[0-9]+$',
    example_reg_number = '26/1/222/BSCS/1234'
where university = 'Ndejje University';

create or replace function public.validate_ndejje_student_profile()
returns trigger
language plpgsql
as $$
begin
  if new.university = 'Ndejje University'
     and new.student_registration_number is not null
     and new.student_registration_number !~ '^[0-9]{2}/[0-9]+/[0-9]{3,4}/[A-Za-z]+/[0-9]+$' then
    raise exception 'Ndejje University registration number must match format xx/x/xxx/ALPHABET/number (e.g. 26/1/222/BSCS/1234)';
  end if;
  return new;
end;
$$;
