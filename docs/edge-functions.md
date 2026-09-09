# Supabase Edge Functions

## google-sheets-sync

### Purpose
Automatically sync group, student, and coursework data to Google Sheets when changes occur.

### Trigger
- Database trigger on INSERT/UPDATE of groups, users (students), courseworks
- Manual trigger via API endpoint

### Implementation
```typescript
// supabase/functions/google-sheets-sync/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleAuth } from "https://esm.sh/google-auth-library@9"

serve(async (req) => {
  // 1. Parse payload { entity_type, entity_id }
  // 2. Fetch full entity data with relations
  // 3. Authenticate with Google Sheets API using service account
  // 4. Check/create sheet by entity_type (Groups/Students/Coursework)
  // 5. Upsert row by entity_id (first column)
  // 6. Update google_sheets_sync table status
})
```

### Sheets Structure

#### Groups Sheet
| Group ID | Course Code | Coursework | Group Name | Description | Leader | Leader Email | Status | Visibility | Max Members | Current Members | Created At |

#### Students Sheet
| Student ID | Full Name | Email | Registration Number | Course | WhatsApp Phone | Role | Created At |

#### Coursework Sheet
| Coursework ID | Course Code | Course Name | Title | Description | Type | Min Group | Max Group | Self Formation | Published | Lock Date | Groups Count | Created At |

### Environment Variables
- GOOGLE_SHEETS_CLIENT_EMAIL
- GOOGLE_SHEETS_PRIVATE_KEY
- GOOGLE_SHEETS_SPREADSHEET_ID

## sync-scheduler

### Purpose
Process pending syncs in batches (for cron jobs)

### Schedule
Run every 5 minutes via Supabase pg_cron or external cron

```sql
-- Enable pg_cron
CREATE EXTENSION pg_cron;

-- Schedule every 5 minutes
SELECT cron.schedule('process-sheets-sync', '*/5 * * * *', 
  $$ SELECT net.http_post(
    url := 'https://project.supabase.co/functions/v1/sync-scheduler',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'::jsonb
  ) $$
);
```