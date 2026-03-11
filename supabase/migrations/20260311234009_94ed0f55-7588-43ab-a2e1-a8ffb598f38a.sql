
-- Game scores table for tracking individual game sessions
CREATE TABLE public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  earned_points integer NOT NULL DEFAULT 0,
  doubled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own game scores"
  ON public.game_scores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own game scores"
  ON public.game_scores FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- User points balance table
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points"
  ON public.user_points FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points"
  ON public.user_points FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own points"
  ON public.user_points FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Function to add game points atomically
CREATE OR REPLACE FUNCTION public.add_game_points(p_user_id uuid, p_score integer, p_doubled boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earned integer;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot add points for other users';
  END IF;

  v_earned := GREATEST(1, p_score / 20);
  IF p_doubled THEN
    v_earned := v_earned * 2;
  END IF;

  INSERT INTO public.game_scores (user_id, score, earned_points, doubled)
  VALUES (p_user_id, p_score, v_earned, p_doubled);

  INSERT INTO public.user_points (user_id, total_points, updated_at)
  VALUES (p_user_id, v_earned, now())
  ON CONFLICT (user_id)
  DO UPDATE SET total_points = user_points.total_points + v_earned, updated_at = now();

  RETURN v_earned;
END;
$$;

-- Public ranking view
CREATE OR REPLACE VIEW public.game_ranking AS
SELECT
  gs.user_id,
  p.display_name,
  MAX(gs.score) as best_score,
  SUM(gs.earned_points) as total_earned,
  COUNT(*) as games_played
FROM public.game_scores gs
LEFT JOIN public.profiles p ON p.user_id = gs.user_id
GROUP BY gs.user_id, p.display_name
ORDER BY best_score DESC
LIMIT 100;
