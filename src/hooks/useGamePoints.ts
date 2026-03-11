import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

export function useGamePoints() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const saveScore = useCallback(async (score: number, doubled = false): Promise<number> => {
    if (!user) return 0;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.rpc('add_game_points', {
        p_user_id: user.id,
        p_score: score,
        p_doubled: doubled,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    } catch (e) {
      console.error('Failed to save game score:', e);
      return Math.max(1, Math.floor(score / 20)) * (doubled ? 2 : 1);
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const { data: myPoints } = useQuery({
    queryKey: ['user-points', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from('user_points')
        .select('total_points')
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.total_points ?? 0;
    },
    enabled: !!user,
  });

  const { data: ranking } = useQuery({
    queryKey: ['game-ranking'],
    queryFn: async () => {
      const { data } = await supabase
        .from('game_ranking' as any)
        .select('*')
        .limit(20);
      return (data ?? []) as Array<{
        user_id: string;
        display_name: string | null;
        best_score: number;
        total_earned: number;
        games_played: number;
      }>;
    },
  });

  const { data: myBestScore } = useQuery({
    queryKey: ['my-best-score', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from('game_scores')
        .select('score')
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.score ?? 0;
    },
    enabled: !!user,
  });

  return { saveScore, isSaving, myPoints: myPoints ?? 0, ranking: ranking ?? [], myBestScore: myBestScore ?? 0 };
}
