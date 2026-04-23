"use client";
import { useEffect, useState } from "react";
import type { AppProps } from "next/app";

// Prevent Next.js from SSR-rendering any Vite/React Router page.
// These pages are client-only and are served by Vite in production.
export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Component {...pageProps} />;
}
