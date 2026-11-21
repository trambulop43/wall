# The Wall

A social photo feed - a wall, evolved - built with **React 18 + Next.js 14 (App Router) + TypeScript + Supabase**.

Type a message (optionally attach a photo), hit **Share**, and it lands in
Supabase. The feed shows every post newest-first and survives a refresh. New
posts from other visitors appear live, without reloading (Supabase Realtime).
Bonuses: a 280-character limit with a live counter, and photo uploads stored
in Supabase Storage and rendered as a photo feed. Sleek, modern UI with a
responsive layout.

## Stack

- Next.js 14 + React 18 + TypeScript
- Supabase (Postgres + Realtime + Storage) via `@supabase/supabase-js`
- Deployed on Vercel

## Database setup

One table, `posts`:

```sql
create table posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  message text not null,
  image_url text
);

alter table posts enable row level security;

create policy "anyone can read posts"
  on posts for select using (true);

create policy "anyone can write posts"
  on posts for insert with check (true);
```

Realtime is enabled for the `posts` table (supabase_realtime publication).

Photos go to a public Storage bucket, `photos`:

```sql
insert into storage.buckets (id, name, public) values ('photos', 'photos', true);

create policy "public read photos"
  on storage.objects for select using (bucket_id = 'photos');

create policy "anon upload photos"
  on storage.objects for insert with check (bucket_id = 'photos');
```

## Run it locally

```bash
npm install
# set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
npm run dev
```

Then open http://localhost:3000.

## Project layout

```
app/page.tsx        renders the wall
components/Wall.tsx composer, feed, realtime subscription
lib/supabase.ts     Supabase client + Post type
app/globals.css     sleek modern styling
```

## Live demo

Deployed on Vercel: https://wall-amber.vercel.app

Built by Paul Domenic Trambulo.
