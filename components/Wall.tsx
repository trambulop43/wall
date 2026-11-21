"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, type Post } from "../lib/supabase";

// A fixed name per post is fine for this test (no login required).
const POSTER_NAME = "Paul Trambulo";
const MAX_CHARS = 280;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Wall() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prepend a post, ignoring duplicates (Realtime can echo our own insert).
  const addPost = useCallback((post: Post) => {
    setPosts((current) =>
      current.some((p) => p.id === post.id) ? current : [post, ...current]
    );
  }, []);

  // Initial load: newest first.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (fetchError) {
        setError(`Could not load the wall: ${fetchError.message}`);
      } else {
        setPosts(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live updates: new posts appear without a refresh (Supabase Realtime).
  useEffect(() => {
    const channel = supabase
      .channel("wall-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => addPost(payload.new as Post)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [addPost]);

  const remaining = MAX_CHARS - draft.length;
  const canShare = draft.trim().length > 0 && remaining >= 0 && !sharing;

  async function share() {
    if (!canShare) return;
    setSharing(true);
    setError(null);
    const message = draft.trim();
    const { data, error: insertError } = await supabase
      .from("posts")
      .insert({ name: POSTER_NAME, message })
      .select()
      .single();
    if (insertError) {
      setError(`Could not post: ${insertError.message}`);
    } else {
      addPost(data as Post);
      setDraft("");
    }
    setSharing(false);
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="logo">the wall</span>
          <span className="tagline">a 2008-style wall, rebuilt with Next.js + Supabase</span>
        </div>
      </header>
      <main className="page">
        <section className="card composer">
          <h2>What&apos;s on your mind?</h2>
          <textarea
            placeholder="Write something..."
            value={draft}
            maxLength={MAX_CHARS * 2}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) share();
            }}
          />
          <div className="composer-row">
            <span className={`char-count${remaining < 0 ? " over" : ""}`}>
              {remaining} characters left
            </span>
            <button className="share-btn" onClick={share} disabled={!canShare}>
              {sharing ? "Sharing..." : "Share"}
            </button>
          </div>
        </section>

        {error && <div className="error-box">{error}</div>}

        <section className="feed">
          {loading ? (
            <div className="card empty">Loading the wall...</div>
          ) : posts.length === 0 ? (
            <div className="card empty">No posts yet. Be the first to write on the wall!</div>
          ) : (
            posts.map((post) => (
              <article className="card post" key={post.id}>
                <div className="post-head">
                  <span className="post-name">{post.name}</span>
                  <span className="post-time">{formatTime(post.created_at)}</span>
                </div>
                <p className="post-message">{post.message}</p>
              </article>
            ))
          )}
        </section>

        <p className="footer">Built with React + Next.js + Supabase. Deployed on Vercel.</p>
      </main>
    </>
  );
}
