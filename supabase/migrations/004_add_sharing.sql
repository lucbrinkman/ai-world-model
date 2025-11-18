-- Add sharing fields to documents table
ALTER TABLE documents
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN share_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Create index for fast share_token lookups
CREATE INDEX idx_documents_share_token ON documents(share_token) WHERE is_public = true;

-- Create RLS policy to allow viewing public documents
CREATE POLICY "Anyone can view public documents"
  ON documents FOR SELECT
  USING (is_public = true);
