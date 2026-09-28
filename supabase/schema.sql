
begin;
create table if not exists public.launch_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.launch_items enable row level security;
create index if not exists launch_items_user_id_idx on public.launch_items(user_id);
drop policy if exists launch_items_owner on public.launch_items;
create policy launch_items_owner on public.launch_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.launch_items from anon;
grant select, insert, update, delete on public.launch_items to authenticated;
commit;
