-- Create user_graphs table for storing custom graph configurations
CREATE TABLE IF NOT EXISTS public.user_graphs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  graph_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_public BOOLEAN DEFAULT false NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS user_graphs_user_id_idx ON public.user_graphs(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS user_graphs_created_at_idx ON public.user_graphs(created_at DESC);

-- Create index on is_default for quick default graph lookup
CREATE INDEX IF NOT EXISTS user_graphs_is_default_idx ON public.user_graphs(user_id, is_default) WHERE is_default = true;

-- Enable Row Level Security
ALTER TABLE public.user_graphs ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own graphs
CREATE POLICY "Users can view own graphs"
  ON public.user_graphs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own graphs
CREATE POLICY "Users can insert own graphs"
  ON public.user_graphs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own graphs
CREATE POLICY "Users can update own graphs"
  ON public.user_graphs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own graphs
CREATE POLICY "Users can delete own graphs"
  ON public.user_graphs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policy: Anyone can view public graphs (for future sharing feature)
CREATE POLICY "Anyone can view public graphs"
  ON public.user_graphs
  FOR SELECT
  USING (is_public = true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_graphs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comment describing graph_data structure
COMMENT ON COLUMN public.user_graphs.graph_data IS 'JSONB containing complete graph structure: {nodes: GraphNode[], edges: Edge[], metadata: {version: string, lastModified: timestamp}}';
