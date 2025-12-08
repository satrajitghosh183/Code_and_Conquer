import { createClient } from '@supabase/supabase-js'

// Support both new and old environment variable names
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_JWT_TOKEN

// Debug logging to verify environment variables are loaded
console.log('[Supabase Client] Initializing...')
console.log('[Supabase Client] URL present:', !!supabaseUrl)
console.log('[Supabase Client] Key present:', !!supabaseKey)
console.log('[Supabase Client] Key length:', supabaseKey?.length || 0)

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('Required: VITE_SUPABASE_URL (or SUPABASE_URL) and VITE_SUPABASE_ANON_KEY (or SUPABASE_JWT_TOKEN)')
  console.error('Current env check:')
  console.error('  VITE_SUPABASE_URL:', !!import.meta.env.VITE_SUPABASE_URL)
  console.error('  SUPABASE_URL:', !!import.meta.env.SUPABASE_URL)
  console.error('  VITE_SUPABASE_ANON_KEY:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)
  console.error('  SUPABASE_JWT_TOKEN:', !!import.meta.env.SUPABASE_JWT_TOKEN)
  throw new Error('Missing Supabase environment variables')
}

// Create client - Supabase JS client automatically adds 'apikey' header
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

