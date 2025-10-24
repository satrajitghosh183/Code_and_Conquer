import { supabase } from './supabaseClient.js'  // adjust path if needed

//test if supabase connection is working
async function testConnection() {
  const { data, error } = await supabase
    .from('users')  
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
