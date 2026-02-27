-- Community image upload bucket/policies for editor image insert.
-- Safe to run multiple times.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'community-uploads',
  'community-uploads',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read community uploads" on storage.objects;
create policy "Public read community uploads"
on storage.objects
for select
using (bucket_id = 'community-uploads');

drop policy if exists "Authenticated upload community uploads" on storage.objects;
create policy "Authenticated upload community uploads"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'community-uploads');

drop policy if exists "Owner update community uploads" on storage.objects;
create policy "Owner update community uploads"
on storage.objects
for update
to authenticated
using (bucket_id = 'community-uploads' and owner = auth.uid())
with check (bucket_id = 'community-uploads' and owner = auth.uid());

drop policy if exists "Owner delete community uploads" on storage.objects;
create policy "Owner delete community uploads"
on storage.objects
for delete
to authenticated
using (bucket_id = 'community-uploads' and owner = auth.uid());
