-- Populate profiles.display_name from auth metadata.
--
-- handle_new_user only ever inserted (user_id, email), so display_name stayed
-- NULL for every account. The couple link UI shows "내 파트너" with no way to
-- tell *who* you're linked with. OAuth/email signups carry a name in
-- raw_user_meta_data ('name' or 'full_name'); copy it into display_name.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(
      COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name'
      ),
      ''
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  BEGIN
    INSERT INTO public.user_points (user_id, balance, total_earned, total_points)
    VALUES (NEW.id, 1000, 1000, 1000)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.point_transactions (user_id, amount, reason, balance_after)
    VALUES (NEW.id, 1000, 'signup_bonus', 1000);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user signup_bonus failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- Backfill existing rows whose display_name is still empty.
UPDATE public.profiles p
SET display_name = NULLIF(
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name'),
  ''
)
FROM auth.users au
WHERE au.id = p.user_id
  AND (p.display_name IS NULL OR p.display_name = '')
  AND COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name') IS NOT NULL;
