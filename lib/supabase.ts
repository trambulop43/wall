import { createClient } from "@supabase/supabase-js";

// Public anon key + project URL are safe to expose in the browser.
// Row Level Security on the `posts` table limits what anyone can do with them.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Post = {
  id: number;
  created_at: string;
  name: string;
  message: string;
  image_url: string | null;
};
