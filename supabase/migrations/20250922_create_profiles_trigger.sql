-- Create profiles table (idempotent)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  company_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_auth_user_id on public.profiles(auth_user_id);

-- Function to handle new auth users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  pic text := coalesce(new.raw_user_meta_data->>'picture','');
  email text := coalesce(new.email,'');
  company text := nullif(split_part(email, '@', 1),'');
begin
  insert into public.profiles (auth_user_id, company_name, avatar_url)
  values (new.id, company, pic)
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

-- Trigger to create profile automatically on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


