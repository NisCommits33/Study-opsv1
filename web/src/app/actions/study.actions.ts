/**
 * @file study.actions.ts
 * @description Server actions for tracking study progress and weak spots.
 */

'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function logWeakSpotAction(data: {
  exam_id?: string
  section_id?: string
  topic: string
  source: 'quiz' | 'interview' | 'assistant'
  description?: string
  severity?: 'low' | 'medium' | 'high'
}) {
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

    // Deduplicate: If same topic/source exists, just update last_seen_at (if table has it)
    // For now, simple insert
    const { error } = await supabase.from('weak_spots').insert({
      user_id: user.id,
      ...data,
      created_at: new Date().toISOString()
    })

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Log Weak Spot Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getWeakSpotsAction() {
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

    const { data, error } = await supabase
      .from('weak_spots')
      .select('*, exam:exam_id(title), section:section_id(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getAnalyticsAction() {
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

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [sessionsRes, weakRes] = await Promise.all([
      supabase.from('study_sessions').select('*').eq('user_id', user.id).gte('started_at', sevenDaysAgo.toISOString()),
      supabase.from('weak_spots').select('*').eq('user_id', user.id)
    ])

    const sessions = sessionsRes.data || []
    const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)
    
    // Group by day for a simple chart
    const dailyStats = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const daySessions = sessions.filter(s => s.started_at?.startsWith(dateStr))
        const minutes = daySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)
        return { date: dateStr, minutes }
    }).reverse()

    return {
      success: true,
      stats: {
        totalHours: (totalMinutes / 60).toFixed(1),
        sessionCount: sessions.length,
        weakSpotCount: weakRes.data?.length || 0,
        dailyStats
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Logs a completed study session with energy level tracking.
 */
export async function logStudySessionAction(data: {
  exam_id?: string
  section_id?: string
  duration_minutes: number
  energy_level: 'high' | 'medium' | 'low'
  score?: number
}) {
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

    const energyMap = { high: 5, medium: 3, low: 1 }

    const { error } = await supabase.from('study_sessions').insert({
      user_id: user.id,
      exam_id: data.exam_id,
      section_id: data.section_id,
      duration_minutes: data.duration_minutes,
      energy_after: energyMap[data.energy_level],
      started_at: new Date().toISOString()
    })

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
