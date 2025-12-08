-- Create user_stats for a specific user
-- Replace 'USER_ID_HERE' with the actual user ID

-- Example: Create stats for user d14f3b48-b889-450f-a792-eef12ed36476
INSERT INTO user_stats (id, coins, xp, level, problems_solved, games_played, wins)
VALUES (
  'd14f3b48-b889-450f-a792-eef12ed36476',
  10000,  -- Give them 10k coins
  0,
  1,
  0,
  0,
  0
)
ON CONFLICT (id) DO UPDATE
SET 
  coins = COALESCE(user_stats.coins, 0) + 10000,
  updated_at = NOW();

-- Verify it was created
SELECT * FROM user_stats WHERE id = 'd14f3b48-b889-450f-a792-eef12ed36476';

