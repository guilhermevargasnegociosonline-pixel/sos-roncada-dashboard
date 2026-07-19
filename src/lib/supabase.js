import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL_BASE = 'https://bnkesshzstryzfoipres.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2Vzc2h6c3RyeXpmb2lwcmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODY1NjcsImV4cCI6MjA5NTU2MjU2N30.2XodPoFyEaUSLD7fW2HXzl0qJC6ohdKFIHLdgFrZzKI'

export const supabase = createClient(SUPABASE_URL_BASE, SUPABASE_ANON_KEY)

export const DIAGNOSTICAR_WEBHOOK = 'https://webhook.pedroroncada.com.br/webhook/diagnosticar-falha'
export const NOTIFICAR_LIBERADO_WEBHOOK = 'https://n8n.pedroroncada.com.br/webhook/notificar-liberado'
