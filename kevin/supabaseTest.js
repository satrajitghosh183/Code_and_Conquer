import { supabase } from './supabaseClient.js'  // adjust path if needed

async function testConnection() {
  const { data, error } = await supabase
    .from('users')  // change to any table you have
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Supabase connection failed:', error)
  } else {
    console.log('✅ Supabase connected successfully!')
    console.log('Sample data:', data)
  }
}

testConnection()
