import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: pendingSyncs } = await supabase
      .from('google_sheets_sync')
      .select('*')
      .eq('sync_status', 'pending')
      .limit(50)

    if (!pendingSyncs || pendingSyncs.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending syncs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results = []

    for (const sync of pendingSyncs) {
      try {
        // Call the google-sheets-sync function for each pending item
        const response = await fetch(`${supabaseUrl}/functions/v1/google-sheets-sync`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entity_type: sync.entity_type,
            entity_id: sync.entity_id,
          }),
        })

        const result = await response.json()
        results.push({ ...sync, result })
      } catch (error) {
        results.push({ ...sync, error: error.message })
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})