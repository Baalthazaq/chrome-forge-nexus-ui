ALTER TABLE public.tome_shares
ADD COLUMN IF NOT EXISTS share_type text NOT NULL DEFAULT 'copy' CHECK (share_type IN ('copy','collaborate'));