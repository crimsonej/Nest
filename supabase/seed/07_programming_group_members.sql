-- Create groups and import student memberships for Principles of Programming.
-- Run after the users and course unit seed data exist.

begin;

create temporary table programming_group_import (
  group_name text not null,
  student_name text not null
) on commit drop;

insert into programming_group_import (group_name, student_name)
values
  ('Group 1', 'Wannyana Leah Rebecca'),
  ('Group 1', 'Mbambu Mildred Apipawe'),
  ('Group 1', 'Kaweesa Herman'),
  ('Group 1', 'Nassanga Florence'),
  ('Group 1', 'Mpairwe Iyan'),
  ('Group 2', 'Aturinde Timothy'),
  ('Group 2', 'Kamoga Isaac'),
  ('Group 2', 'Matovu Emmanuel'),
  ('Group 2', 'Ssebagala Paul'),
  ('Group 2', 'Ariho Ameria'),
  ('Group 3', 'Kakuru In Gil'),
  ('Group 3', 'Okello Peter harvine'),
  ('Group 3', 'Kusemererwa Allan'),
  ('Group 3', 'Byarugaba Cestus'),
  ('Group 3', 'Mukisa Elijah Prince'),
  ('Group 4', 'Nanteza Letisha'),
  ('Group 4', 'Kutosi Joel'),
  ('Group 4', 'Gomito Joshua'),
  ('Group 4', 'Nambejja Leone'),
  ('Group 4', 'Semakula Rayan'),
  ('Group 4', 'Nakigudde Winnie'),
  ('Group 5', 'Luyima Tonny'),
  ('Group 5', 'Omedo Mark Anthony'),
  ('Group 5', 'Kibirango Musa'),
  ('Group 5', 'Kibirige Elijah'),
  ('Group 5', 'Nakimuli Juliana'),
  ('Group 6', 'Olwa Ryan'),
  ('Group 6', 'Mangeni Caleb Peter'),
  ('Group 6', 'Kato Arnold Birungi'),
  ('Group 6', 'Anguech Salome Naome'),
  ('Group 6', 'Ebiat Calvin Ephraim'),
  ('Group 7', 'Nabagereka Damalie'),
  ('Group 7', 'Nankunda Density'),
  ('Group 7', 'Ankunda Daphine'),
  ('Group 7', 'Talemwa Dickson'),
  ('Group 7', 'Atukwasa Bridget'),
  ('Group 8', 'Mirembe Daniella Stara'),
  ('Group 8', 'Awebwa Maimuna'),
  ('Group 8', 'Titus Aaron Nyende'),
  ('Group 8', 'Dovin Ssenyange'),
  ('Group 8', 'Alinaitwe Talemwa'),
  ('Group 9', 'Wamani Joseph'),
  ('Group 9', 'Tussime Derick'),
  ('Group 9', 'Musasizi Jeremiah'),
  ('Group 9', 'Bamwesiga Blair'),
  ('Group 9', 'Ainebyona Jatham'),
  ('Group 10', 'Nassali Joan'),
  ('Group 10', 'Najjemba Sonia Precious'),
  ('Group 10', 'Akankwasa Martin'),
  ('Group 10', 'Nassazi Janat'),
  ('Group 10', 'Anguzu Ondoma Alvin'),
  ('Group 11', 'Omondi Malcolm'),
  ('Group 11', 'Oboore Nathan'),
  ('Group 11', 'Kato Cyrus'),
  ('Group 11', 'Mukisa Patrico'),
  ('Group 11', 'Mutebi Jonathan'),
  ('Group 12', 'Muhumuza Phillip'),
  ('Group 12', 'Peter Lomeling David'),
  ('Group 12', 'Namuyanja Renita Kyeyune'),
  ('Group 12', 'Nakuya Irene'),
  ('Group 12', 'Ishimwe Rouben'),
  ('Group 13', 'Mulindwa Ian'),
  ('Group 13', 'Mulumba Musa'),
  ('Group 13', 'SEKANGU COLLINS'),
  ('Group 13', 'Nakabugo Peace Shifrah'),
  ('Group 13', 'Nassazi Janat'),
  ('Group 14', 'Namuyomba Hilda'),
  ('Group 14', 'Ssebagala Marvin'),
  ('Group 14', 'Ssengondo Marvin'),
  ('Group 14', 'Mungwe Petrus'),
  ('Group 14', 'Assimwe Albert'),
  ('Group 15', 'Nyakojo Ronnie'),
  ('Group 15', 'Keinganabusha Herbert'),
  ('Group 15', 'Ekabat Joel'),
  ('Group 15', 'Kasirye Titus'),
  ('Group 15', 'Kasibanye Aaron Trever'),
  ('Group 16', 'Elvis Mulega'),
  ('Group 16', 'Balamaga Martin'),
  ('Group 16', 'Naome Karoshere'),
  ('Group 16', 'Peace Nakirumbi'),
  ('Group 16', 'Owor Joseph'),
  ('Group 17', 'Mwilo Nicholas'),
  ('Group 17', 'Aisu Nathan Shem'),
  ('Group 17', 'Ayamba Martha'),
  ('Group 17', 'Mubiru Kassimu'),
  ('Group 17', 'Wasswa Ronald'),
  ('Group 18', 'Mukisa Daniel Truth'),
  ('Group 18', 'Hiire Reagan Dison'),
  ('Group 18', 'Masinde Brian Euphania'),
  ('Group 18', 'Byaruhanga Ruth'),
  ('Group 18', 'Aturinda Patience'),
  ('Group 19', 'Ayebare Josephine'),
  ('Group 19', 'Kabuye Ceaser'),
  ('Group 19', 'Mugisha Shedrick Fredrick'),
  ('Group 19', 'Biira Faridah Asumini'),
  ('Group 19', 'Kamoga Matthew'),
  ('Group 20', 'MUBIRU ANDREW'),
  ('Group 20', 'BWAYO JONATHAN'),
  ('Group 20', 'AWEBWA MAIMUNA'),
  ('Group 20', 'ONYANG BRIAN JOEL'),
  ('Group 20', 'Dembe Shalom'),
  ('Group 21', 'Regboda William Ettore.'),
  ('Group 21', 'Kayitale Marvin vicent'),
  ('Group 21', 'KISAKYE REAGAN OSBORN'),
  ('Group 21', 'Abaho Ostine');

do $$
declare
  programming_unit_id uuid;
  programming_coursework_id uuid;
  group_row record;
  group_leader_id uuid;
begin
  select id into programming_unit_id
  from public.course_units
  where code = '1101-PP' and is_active = true
  limit 1;

  if programming_unit_id is null then
    raise exception 'Course unit 1101-PP (Principles of Programming) was not found.';
  end if;

  select id into programming_coursework_id
  from public.courseworks
  where course_unit_id = programming_unit_id
    and lower(trim(title)) = lower('Programming KLA DAY')
  order by created_at
  limit 1;

  if programming_coursework_id is null then
    insert into public.courseworks (
      course_unit_id,
      title,
      description,
      type,
      max_group_size,
      min_group_size,
      allow_self_formation,
      is_published,
      work_style,
      submission_mode
    )
    values (
      programming_unit_id,
      'Programming KLA DAY',
      'Groups imported from Groups_for_Programming KLA DAY.xlsx',
      'assignment',
      5,
      1,
      false,
      true,
      'group_work',
      'email'
    )
    returning id into programming_coursework_id;
  end if;

  for group_row in
    select distinct group_name
    from programming_group_import
    order by group_name
  loop
    select u.id into group_leader_id
    from public.users u
    join programming_group_import i
      on lower(regexp_replace(trim(u.full_name), '\s+', ' ', 'g')) =
         lower(regexp_replace(trim(i.student_name), '\s+', ' ', 'g'))
    where u.role = 'student'
      and i.group_name = group_row.group_name
      and not exists (
        select 1
        from public.users duplicate
        where duplicate.role = 'student'
          and lower(regexp_replace(trim(duplicate.full_name), '\s+', ' ', 'g')) =
              lower(regexp_replace(trim(u.full_name), '\s+', ' ', 'g'))
          and duplicate.id <> u.id
      )
    order by lower(regexp_replace(trim(u.full_name), '\s+', ' ', 'g'))
    limit 1;

    if group_leader_id is not null then
      insert into public.groups (
        coursework_id,
        name,
        description,
        leader_id,
        is_private,
        status,
        max_members
      )
      select
        programming_coursework_id,
        group_row.group_name,
        'Imported from Groups_for_Programming KLA DAY.xlsx',
        group_leader_id,
        false,
        'forming',
          5
      where not exists (
        select 1
        from public.groups g
        where g.coursework_id = programming_coursework_id
          and lower(trim(g.name)) = lower(trim(group_row.group_name))
      );
    end if;
  end loop;
end;
$$;

with normalized_users as (
  select
    id,
    lower(regexp_replace(trim(full_name), '\s+', ' ', 'g')) as normalized_name
  from public.users
  where role = 'student'
), unique_users as (
  select normalized_name, (array_agg(id))[1] as user_id
  from normalized_users
  group by normalized_name
  having count(*) = 1
)
insert into public.group_members (group_id, user_id, role)
select g.id, u.user_id, 'member'
from (
  select
    i.*,
    row_number() over (
      partition by lower(trim(i.group_name))
      order by i.student_name
    ) as member_number
  from programming_group_import i
) i
join unique_users u
  on u.normalized_name = lower(regexp_replace(trim(i.student_name), '\s+', ' ', 'g'))
join public.groups g
  on lower(trim(g.name)) = lower(trim(i.group_name))
join public.courseworks cw on cw.id = g.coursework_id
join public.course_units cu on cu.id = cw.course_unit_id
where cu.code = '1101-PP'
  and cw.title = 'Programming KLA DAY'
  and i.member_number <= 5
on conflict (group_id, user_id) do nothing;

-- Review rows that were skipped because the student/group was not found or
-- the name matched more than one student account.
with user_matches as (
  select
    i.group_name,
    i.student_name,
    count(u.id) as matching_users,
    count(cu.id) as matching_groups
  from programming_group_import i
  left join public.users u
    on lower(regexp_replace(trim(u.full_name), '\s+', ' ', 'g')) =
       lower(regexp_replace(trim(i.student_name), '\s+', ' ', 'g'))
   and u.role = 'student'
  left join public.groups g on lower(trim(g.name)) = lower(trim(i.group_name))
  left join public.courseworks cw on cw.id = g.coursework_id
  left join public.course_units cu on cu.id = cw.course_unit_id
   and cu.code = '1101-PP'
  group by i.group_name, i.student_name
)
select
  group_name,
  student_name,
  case
    when matching_users = 0 then 'student not found in public.users'
    when matching_users > 1 then 'student name is ambiguous'
    when matching_groups = 0 then 'group not found for course unit 1101-PP'
  end as skip_reason
from user_matches
where matching_users <> 1 or matching_groups = 0
order by group_name, student_name;

-- Review groups whose spreadsheet rows do not contain exactly five names.
select
  group_name,
  count(*) as spreadsheet_members,
  case
    when count(*) > 5 then 'more than five names; only five were imported'
    when count(*) < 5 then 'fewer than five names; no missing name was invented'
  end as group_size_note
from programming_group_import
group by group_name
having count(*) <> 5
order by group_name;

-- Keep an already-created coursework and groups aligned when this script is rerun.
update public.courseworks
set max_group_size = 5,
    updated_at = now()
where id = (
  select cw.id
  from public.courseworks cw
  join public.course_units cu on cu.id = cw.course_unit_id
  where cu.code = '1101-PP'
    and lower(trim(cw.title)) = lower('Programming KLA DAY')
  order by cw.created_at
  limit 1
);

update public.groups
set max_members = 5,
    updated_at = now()
where coursework_id = (
  select cw.id
  from public.courseworks cw
  join public.course_units cu on cu.id = cw.course_unit_id
  where cu.code = '1101-PP'
    and lower(trim(cw.title)) = lower('Programming KLA DAY')
  order by cw.created_at
  limit 1
);

commit;