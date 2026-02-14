-- Database Schema for Timeline Application
-- This schema uses snake_case for all tables and columns options.
-- It establishes proper foreign key relationships with cascading deletes.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Workspaces Table
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#000000',
  is_hidden boolean default false,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workspaces enable row level security;

create policy "Users can view their own workspaces"
  on public.workspaces for select
  using (auth.uid() = user_id);

create policy "Users can insert their own workspaces"
  on public.workspaces for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own workspaces"
  on public.workspaces for update
  using (auth.uid() = user_id);

create policy "Users can delete their own workspaces"
  on public.workspaces for delete
  using (auth.uid() = user_id);

-- 2. Projects Table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  color text,
  position integer default 0,
  is_hidden boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;

-- RLS for Projects (using join through workspace)
create policy "Users can view projects in their workspaces"
  on public.projects for select
  using (exists (select 1 from public.workspaces w where w.id = projects.workspace_id and w.user_id = auth.uid()));

create policy "Users can insert projects in their workspaces"
  on public.projects for insert
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()));

create policy "Users can update projects in their workspaces"
  on public.projects for update
  using (exists (select 1 from public.workspaces w where w.id = projects.workspace_id and w.user_id = auth.uid()));

create policy "Users can delete projects in their workspaces"
  on public.projects for delete
  using (exists (select 1 from public.workspaces w where w.id = projects.workspace_id and w.user_id = auth.uid()));

-- 3. Sub Projects Table
create table public.sub_projects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  start_date date,
  end_date date,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sub_projects enable row level security;

-- RLS for Sub Projects
create policy "Users can interact with sub_projects via project ownership"
  on public.sub_projects for all
  using (exists (
    select 1 from public.projects p
    join public.workspaces w on w.id = p.workspace_id
    where p.id = sub_projects.project_id and w.user_id = auth.uid()
  ));

-- 4. Milestones Table
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  content text,
  date date,
  color text,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.milestones enable row level security;

-- RLS for Milestones
create policy "Users can interact with milestones via project ownership"
  on public.milestones for all
  using (exists (
    select 1 from public.projects p
    join public.workspaces w on w.id = p.workspace_id
    where p.id = milestones.project_id and w.user_id = auth.uid()
  ));

-- 5. Timeline Items Table
create table public.timeline_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  sub_project_id uuid references public.sub_projects(id) on delete set null,
  title text not null,
  content text,
  date date,
  color text,
  completed boolean default false,
  completed_at timestamp with time zone,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.timeline_items enable row level security;

-- RLS for Timeline Items
create policy "Users can interact with timeline_items via project ownership"
  on public.timeline_items for all
  using (exists (
    select 1 from public.projects p
    join public.workspaces w on w.id = p.workspace_id
    where p.id = timeline_items.project_id and w.user_id = auth.uid()
  ));

-- 6. User Settings Table
create table public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  workspace_order jsonb,
  open_project_ids jsonb,
  theme text,
  system_accent text,
  color_mode text,
  blur_effects_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Backfill safety for existing deployments
alter table public.user_settings add column if not exists theme text;
alter table public.user_settings add column if not exists system_accent text;
alter table public.user_settings add column if not exists color_mode text;
alter table public.user_settings add column if not exists blur_effects_enabled boolean default true;

alter table public.user_settings enable row level security;

create policy "Users can manage their own settings"
  on public.user_settings for all
  using (auth.uid() = user_id);

-- Optional: Function to update updated_at automatically
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_workspaces_updated_at before update on public.workspaces for each row execute procedure update_updated_at_column();
create trigger update_projects_updated_at before update on public.projects for each row execute procedure update_updated_at_column();
create trigger update_sub_projects_updated_at before update on public.sub_projects for each row execute procedure update_updated_at_column();
create trigger update_milestones_updated_at before update on public.milestones for each row execute procedure update_updated_at_column();
create trigger update_timeline_items_updated_at before update on public.timeline_items for each row execute procedure update_updated_at_column();
create trigger update_user_settings_updated_at before update on public.user_settings for each row execute procedure update_updated_at_column();
