
-- Couple votes table for opinion board
CREATE TABLE public.couple_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  partner_user_id UUID,
  topic TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  my_pick TEXT,
  my_reason TEXT,
  partner_pick TEXT,
  partner_reason TEXT,
  ai_suggestion TEXT,
  status TEXT NOT NULL DEFAULT 'voting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own couple votes"
  ON public.couple_votes FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_user_id);

CREATE POLICY "Users can create couple votes"
  ON public.couple_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own couple votes"
  ON public.couple_votes FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = partner_user_id);

CREATE POLICY "Users can delete own couple votes"
  ON public.couple_votes FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_couple_votes_updated_at
  BEFORE UPDATE ON public.couple_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
