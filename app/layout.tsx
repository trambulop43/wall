import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Wall",
  description: "A 2008 Facebook-style wall, rebuilt with React, Next.js and Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
