# NEST

A centralized web platform for streamlining course unit grouping, collaborative organization, and administrative oversight for students and lecturers.

Created by Kibirige Joachim Elijah.
GitHub: https://github.com/crimsonej/crimsonej

## Features

### Student Portal
- **Group Formation**: Create, browse, and join project/study groups by course unit
- **Coursework Management**: Track tasks with Kanban-style boards (To Do, In Progress, Submitted)
- **Real-time Sync**: Supabase Realtime can be enabled for roster updates and status changes
- **Resource Sharing**: Upload and share files within groups

### Coordinator Portal
- **Dashboard**: Metrics overview (active courses, students, groups, formation rate)
- **Group Monitor**: Real-time table with filtering, locking, and CSV export
- **Coursework Manager**: Create assignments, set group sizes, configure auto-lock deadlines
- **Interventions**: Auto-assign unassigned students, manual override controls
- **Reports**: Filterable exports (Groups, Students, Coursework, Tasks) with CSV download
- **Google Sheets Sync**: Optional background synchronization after credentials and Edge Functions are configured

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Tables**: TanStack Table

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase CLI
- Docker (for local Supabase)

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Start local Supabase:
```bash
npm run supabase:start
```

3. Push database schema:
```bash
npm run supabase:db:push
```

4. Generate TypeScript types:
```bash
npm run db:generate
```

5. Start development server:
```bash
npm run dev
```

6. Open http://localhost:3000

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Google Sheets Integration
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
```

### Deploy Edge Functions

```bash
npm run supabase:functions:deploy
```

## Database Schema

The schema includes tables for:
- `users` - Extended profiles (students, coordinators, lecturers)
- `course_units` - Academic courses with coordinators
- `courseworks` - Assignments/projects with group settings
- `groups` - Student groups with privacy and status
- `group_members` - Membership with roles
- `group_join_requests` - Private group join requests
- `tasks` - Individual/group task tracking
- `resources` - File sharing within groups
- `audit_logs` - Comprehensive action logging
- `google_sheets_sync` - Sync status tracking

All tables have Row Level Security policies for data isolation.

## User Roles

- **Student**: Register, join/create groups, manage tasks
- **Coordinator**: Full oversight, create coursework, manage groups, interventions, reports
- **Lecturer**: View access to coursework and groups

## Google Sheets Integration

1. Create a Google Cloud project
2. Enable Google Sheets API
3. Create a Service Account with Editor access to your spreadsheet
4. Add credentials to Supabase Edge Function secrets:
   ```bash
   supabase secrets set GOOGLE_SHEETS_CLIENT_EMAIL=...
   supabase secrets set GOOGLE_SHEETS_PRIVATE_KEY=...
   supabase secrets set GOOGLE_SHEETS_SPREADSHEET_ID=...
   ```
5. The sync runs automatically on group/student/coursework changes

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── student/           # Student portal pages
│   └── coordinator/       # Coordinator portal pages
├── components/
│   ├── ui/                # Reusable UI components
│   ├── student/           # Student-specific components
│   ├── coordinator/       # Coordinator-specific components
│   └── shared/            # Shared layout components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities, Supabase clients, validators
└── types/                 # TypeScript type definitions

supabase/
├── functions/             # Edge Functions
│   ├── google-sheets-sync/
│   └── sync-scheduler/
└── schema/                # Database migrations
```

## Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run ESLint
npm run type-check       # TypeScript check
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop local Supabase
npm run supabase:db:push # Push schema changes
npm run db:generate      # Generate TypeScript types
```

## License

MIT