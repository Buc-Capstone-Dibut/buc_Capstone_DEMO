ALTER TABLE "public"."workspaces"
ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'workspace-covers',
  'workspace-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Workspace covers are publicly readable" ON storage.objects;
CREATE POLICY "Workspace covers are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'workspace-covers');

DROP POLICY IF EXISTS "Workspace owners can upload covers" ON storage.objects;
CREATE POLICY "Workspace owners can upload covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'workspace-covers'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id::text = (storage.foldername(name))[1]
      AND member.user_id = (SELECT auth.uid())
      AND member.role = 'owner'
  )
);

DROP POLICY IF EXISTS "Workspace owners can delete covers" ON storage.objects;
CREATE POLICY "Workspace owners can delete covers"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'workspace-covers'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id::text = (storage.foldername(name))[1]
      AND member.user_id = (SELECT auth.uid())
      AND member.role = 'owner'
  )
);
