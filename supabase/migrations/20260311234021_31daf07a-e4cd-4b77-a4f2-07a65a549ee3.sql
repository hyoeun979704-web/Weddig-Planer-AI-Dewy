
-- Fix: Drop SECURITY DEFINER view and recreate as SECURITY INVOKER
DROP VIEW IF EXISTS public.game_ranking;

CREATE VIEW public.game_ranking
WITH (security_invoker = true)
AS
SELECT
  gs.user_id,
  p.display_name,
  MAX(gs.score) as best_score,
  SUM(gs.earned_points)::integer as total_earned,
  COUNT(*)::integer as games_played
FROM public.game_scores gs
LEFT JOIN public.profiles p ON p.user_id = gs.user_id
GROUP BY gs.user_id, p.display_name
ORDER BY best_score DESC
LIMIT 100;

-- Allow anyone to read ranking (public leaderboard)
CREATE POLICY "Anyone can view game scores for ranking"
  ON public.game_scores FOR SELECT TO anon, authenticated
  USING (true);

-- Drop the restrictive select policy
DROP POLICY IF EXISTS "Users can view own game scores" ON public.game_scores;
