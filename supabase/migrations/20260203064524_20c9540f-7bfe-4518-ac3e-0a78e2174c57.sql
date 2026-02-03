-- Create user_wedding_settings table for storing wedding date and settings
CREATE TABLE public.user_wedding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  wedding_date DATE,
  partner_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_schedule_items table for storing wedding checklist items
CREATE TABLE public.user_schedule_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_wedding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_schedule_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_wedding_settings
CREATE POLICY "Users can view their own wedding settings"
  ON public.user_wedding_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wedding settings"
  ON public.user_wedding_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wedding settings"
  ON public.user_wedding_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for user_schedule_items
CREATE POLICY "Users can view their own schedule items"
  ON public.user_schedule_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule items"
  ON public.user_schedule_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule items"
  ON public.user_schedule_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule items"
  ON public.user_schedule_items FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers for updating updated_at
CREATE TRIGGER update_user_wedding_settings_updated_at
  BEFORE UPDATE ON public.user_wedding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_schedule_items_updated_at
  BEFORE UPDATE ON public.user_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();