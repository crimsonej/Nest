import { createBrowserClient } from '@supabase/ssr'
import { createLocalClient, isLocalDataMode } from '@/lib/local-data'

export function createClient() {
  if (isLocalDataMode()) {
    return createLocalClient()
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}