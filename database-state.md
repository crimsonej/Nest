# Latest Supabase database state (live project)

This file was recovered from the live Supabase project attached to this app.

## Summary

- users: 51 rows
- course_units: 2 rows
- courseworks: 1 row
- groups: 0 rows
- group_members: 0 rows
- group_join_requests: 0 rows
- tasks: 0 rows
- student_course_units: 0 rows
- selected_coordinators: 0 rows
- universities: 1 row
- faculties: 1 row
- courses: 1 row
- audit_logs: 0 rows

## Table details

### users
- Count: 51
- Sample rows:
  - id: f483c3f8-fe44-4036-b2ad-13183e7c3431
    - email: student 1@nest.edu
    - full_name: Student 1
    - role: student
    - status: normal
  - id: 34386725-b22c-448c-83a9-216f02af11d6
    - email: student 2@nest.edu
    - full_name: Student 2
    - role: student
    - status: normal

### course_units
- Count: 2
- Sample rows:
  - id: 5ff4454d-9af1-4914-b544-e3e41c8b4f0c
    - code: CS101
    - name: Introduction to Programming
    - coordinator_id: 11111111-1111-4111-8111-111111111111
  - id: b8ebfef5-b449-4339-aedb-4f0fe69472ed
    - code: CS102
    - name: Data Structures
    - coordinator_id: 11111111-1111-4111-8111-111111111111

### courseworks
- Count: 1
- Sample row:
  - id: ca60ea42-9669-480b-817f-e9c5bb16d22e
  - title: Week 1 Programming Lab
  - course_unit_id: 5ff4454d-9af1-4914-b544-e3e41c8b4f0c
  - is_published: true
  - lock_at: 2026-09-21T07:46:45.619268+00:00

### universities
- Count: 1
- Sample row:
  - id: 37d4c9dc-f2b0-412c-8cf6-072b50cea81b
  - university: Ndejje University
  - abbreviation: NU

### faculties
- Count: 1
- Sample row:
  - id: ab9e46d5-d6a4-452b-bcba-e66a10c0cbd2
  - code: FC
  - name: Faculty of Computing

### courses
- Count: 1
- Sample row:
  - id: 634495d3-0519-4a0e-a66b-23611acc0445
  - code: BSCS
  - name: BSc Computer Science

## Notes

- There are currently no groups, memberships, tasks, join requests, student course-unit assignments, or coordinator selections in the live database.
- The base university/faculty/course metadata is present and active.
- The app already expects the real live database tables by those names; the current state reflects the freshly repopulated project setup.
