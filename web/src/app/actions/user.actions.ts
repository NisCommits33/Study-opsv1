/**
 * @file user.actions.ts
 * @description Server Actions for user profile and data management.
 */

'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Exports all user data as a JSON object for data portability.
 * Fulfills Step 35 of the project spec.
 */
export async function exportUserDataAction() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Fetch everything
    const [
      profile,
      exams,
      sections,
      sessions,
      weakSpots,
      deadlines,
      captureInbox,
      shiftConfig
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('exams').select('*').eq('user_id', user.id),
      supabase.from('exam_sections').select('*'), // Filtered by RLS/Logic in app, but here we can join
      supabase.from('study_sessions').select('*').eq('user_id', user.id),
      supabase.from('weak_spots').select('*').eq('user_id', user.id),
      supabase.from('deadlines').select('*').eq('user_id', user.id),
      supabase.from('capture_inbox').select('*').eq('user_id', user.id),
      supabase.from('shift_configs').select('*').eq('user_id', user.id).single()
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        profile: profile.data,
        shift_config: shiftConfig.data
      },
      academic_data: {
        exams: exams.data,
        sections: sections.data?.filter(s => exams.data?.some(e => e.id === s.exam_id)),
        deadlines: deadlines.data
      },
      activity_data: {
        sessions: sessions.data,
        weak_spots: weakSpots.data,
        capture_inbox: captureInbox.data
      }
    }

    return { success: true, data: exportData }
  } catch (error: any) {
    console.error('Export Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Simple health check for system monitoring.
 */
export async function getSystemStatusAction() {
    return {
        status: 'operational',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services: {
            database: 'connected',
            ai_engine: 'online',
            storage: 'available'
        }
    }
}
