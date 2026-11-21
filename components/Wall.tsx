"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, type Post } from "../lib/supabase";

// A fixed name per post is fine for this test (no login required).
const POSTER_NAME = "Paul Trambulo";
const MAX_CHARS = 280;
const BUCKET = "photos";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Wall() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        setError(`Could not load the feed: ${fetchError.message}`);
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

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const remaining = MAX_CHARS - draft.length;
  const canShare =
    (draft.trim().length > 0 || photo !== null) && remaining >= 0 && !sharing;

  function pickPhoto(file: File | null) {
    if (file && !file.type.startsWith("image/")) {
      setError("Photos only, please.");
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setError("That photo is over 5 MB. Pick a smaller one.");
      return;
    }
    setError(null);
    setPhoto(file);
  }

  async function share() {
    if (!canShare) return;
    setSharing(true);
    setError(null);
    try {
      let imageUrl: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop() || "jpg";
        const path = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, photo, { contentType: photo.type });
        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
        const { data: publicData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(path);
        imageUrl = publicData.publicUrl;
      }
      const { data, error: insertError } = await supabase
        .from("posts")
        .insert({ name: POSTER_NAME, message: draft.trim(), image_url: imageUrl })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);
      addPost(data as Post);
      setDraft("");
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(`Could not post: ${e instanceof Error ? e.message : String(e)}`);
    }
    setSharing(false);
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="logo">the wall</span>
          <span className="tagline">a social photo feed, built with Next.js + Supabase</span>
        </div>
      </header>
      <main className="page">
        <section className="card composer">
          <div className="composer-row">
            <div className="avatar">{initials(POSTER_NAME)}</div>
            <textarea
              placeholder="Share a moment..."
              value={draft}
              maxLength={MAX_CHARS + 40}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") share();
              }}
            />
          </div>
          {preview && (
            <div className="preview">
              <img src={preview} alt="Selected photo preview" />
              <button
                type="button"
                className="preview-remove"
                onClick={() => {
                  setPhoto(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                aria-label="Remove photo"
              >
                x
              </button>
            </div>
          )}
          <div className="composer-actions">
            <label className="photo-button">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
              />
              <span aria-hidden>📷</span> Photo
            </label>
            <span
              className={`counter ${remaining < 0 ? "counter-over" : ""}`}
            >
              {remaining} characters left
            </span>
            <button
              className="share"
              onClick={share}
              disabled={!canShare}
            >
              {sharing ? "Posting..." : "Share"}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </section>

        {loading && <p className="muted">Loading the feed...</p>}
        {!loading && posts.length === 0 && !error && (
          <p className="muted">No posts yet. Be the first to share a moment!</p>
        )}

        {posts.map((post) => (
          <article className="card post" key={post.id}>
            <div className="post-head">
              <div className="avatar">{initials(post.name)}</div>
              <div>
                <div className="post-name">{post.name}</div>
                <time className="post-time">{formatTime(post.created_at)}</time>
              </div>
            </div>
            {post.message && <p className="post-message">{post.message}</p>}
            {post.image_url && (
              <img className="post-image" src={post.image_url} alt="Shared photo" />
            )}
          </article>
        ))}

        <p className="footer muted">
          Built with React + Next.js + Supabase (Database, Storage, Realtime). Deployed on Vercel.
        </p>
      </main>
    </>
  );
}
