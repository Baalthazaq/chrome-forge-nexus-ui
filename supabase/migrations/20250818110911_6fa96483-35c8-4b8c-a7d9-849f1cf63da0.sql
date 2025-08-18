-- Create avatars bucket if it doesn't exist and set appropriate policies
-- 1) Ensure bucket exists
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2) Policies for avatars bucket
-- Public read
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
      and tablename = 'objects' 
      and policyname = 'Avatar images are publicly accessible'
  ) then
    create policy "Avatar images are publicly accessible"
      on storage.objects
      for select
      using (bucket_id = 'avatars');
  end if;
end $$;

-- Authenticated users can upload to a path that starts with their user id (folder-based)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
      and tablename = 'objects' 
      and policyname = 'Users can upload their own avatar'
  ) then
    create policy "Users can upload their own avatar"
      on storage.objects
      for insert
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- Users can update their own files
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
      and tablename = 'objects' 
      and policyname = 'Users can update their own avatar'
  ) then
    create policy "Users can update their own avatar"
      on storage.objects
      for update
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- Users can delete their own files
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' 
      and tablename = 'objects' 
      and policyname = 'Users can delete their own avatar'
  ) then
    create policy "Users can delete their own avatar"
      on storage.objects
      for delete
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;