-- NI FITNESS v6 · Supabase
-- Вставьте целиком в Supabase → SQL Editor → New query → Run.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  telegram_id text primary key,
  username text,
  first_name text,
  last_name text,
  role text not null default 'client' check (role in ('client','admin')),
  assigned_kcal integer not null default 1500 check (assigned_kcal in (1200,1500,1800,2000,2200,2500,3000,3200,3500,4000)),
  subscription_active boolean not null default false,
  subscription_until timestamptz,
  allowed_materials jsonb not null default '["nutrition","products","protein","goals","labels"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null references public.profiles(telegram_id) on delete cascade,
  month date not null,
  win text not null default '',
  hard text not null default '',
  next text not null default '',
  measurement jsonb,
  status text not null default 'на проверке',
  trainer_feedback text not null default '',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(telegram_id, month)
);

create index if not exists monthly_reviews_telegram_idx on public.monthly_reviews(telegram_id);
create index if not exists monthly_reviews_status_idx on public.monthly_reviews(status);

-- Запрещаем прямой доступ через публичный anon API.
alter table public.profiles enable row level security;
alter table public.monthly_reviews enable row level security;

-- Политики намеренно НЕ создаём.
-- Frontend не должен читать эти таблицы напрямую.
-- Vercel API использует service_role key только на сервере.
