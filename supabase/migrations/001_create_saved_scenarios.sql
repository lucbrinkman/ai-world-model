-- Create saved_scenarios table
CREATE TABLE IF NOT EXISTS public.saved_scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slider_values JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_public BOOLEAN DEFAULT false NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS saved_scenarios_user_id_idx ON public.saved_scenarios(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS saved_scenarios_created_at_idx ON public.saved_scenarios(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.saved_scenarios ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own scenarios
CREATE POLICY "Users can view own scenarios"
  ON public.saved_scenarios
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own scenarios
CREATE POLICY "Users can insert own scenarios"
  ON public.saved_scenarios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own scenarios
CREATE POLICY "Users can update own scenarios"
  ON public.saved_scenarios
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own scenarios
CREATE POLICY "Users can delete own scenarios"
  ON public.saved_scenarios
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policy: Anyone can view public scenarios (for future sharing feature)
CREATE POLICY "Anyone can view public scenarios"
  ON public.saved_scenarios
  FOR SELECT
  USING (is_public = true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.saved_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
