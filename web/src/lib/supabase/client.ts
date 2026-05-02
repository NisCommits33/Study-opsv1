/**
 * @file client.ts
 * @description Supabase Browser Client.
 * Optimized for Next.js App Router and SSR session synchronization.
 * 
 * @author Study Ops Engineering
 */

import { createBrowserClient } from '@supabase/ssr'

/**
 * Singleton instance of the Supabase browser client.
 * Automatically handles session persistence via cookies.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
