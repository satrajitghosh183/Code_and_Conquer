import { createClient } from '@supabase/supabase-js'

//api key and url for supabase
const supabaseUrl = 'https://cbekdaqtdqqwzyexmfgp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZWtkYXF0ZHFxd3p5ZXhtZmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzUzNjUsImV4cCI6MjA3NjY1MTM2NX0.KscfPmtfD3edYGZ3-8OVymu0K78ECTp0leZuaclkTMw'
export const supabase = createClient(supabaseUrl, supabaseKey)


    