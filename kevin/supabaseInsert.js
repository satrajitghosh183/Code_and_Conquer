import { supabase } from './supabaseClient.js'

async function insertUser() {
  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        leaderboard_rank: 1,
        username: 'bob_john',
        profile_picture: 'https://example.com/avatar.png',
        elo_rating: 1200,
        task_streak: 3,
        password: 'hashed_password_here', // ideally, store hashed version
        membership_status: 'free',
        daily_limit: 10,
      },
    ])

  if (error) {
    console.error('Error inserting user:', error)
  } else {
    console.log('Inserted user:', data)
  }
}

insertUser()
