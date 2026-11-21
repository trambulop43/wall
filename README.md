# The Wall

A 2008 Facebook-style wall, rebuilt with **React 18 + Next.js 14 (App Router) + TypeScript + Supabase**.

Type a message, hit **Share**, and it lands in a Supabase table. The feed shows
every post newest-first and survives a refresh. New posts from other visitors
appear live, without reloading (Supabase Realtime). Bonus: a 280-character
limit with a live counter.

## Stack

- Next.js 14 + React 18 + TypeScript
- Supabase (Postgres + Realtime) via `@supabase/supabase-js`
- Deployed on Vercel

## Database setup

One table, `posts`:

```sql
create table posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  message text not null
);

alter table posts enable row level security;

create policy "anyone can read posts"
  on posts for select using (true);

create policy "anyone can write posts"
  on posts for insert with check (true);
```

Realtime is enabled for the `posts` table (supabase_realtime publication).

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
app/globals.css     2008-era styling
```

## Live demo

Deployed on Vercel: (URL added after deploy)

Built by Paul Domenic Trambulo.
