/**
 * @file lib/contextBuilder.ts
 * @description Assembles rich user context for the AI assistant.
 * Max ~2,000 tokens of context per call.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getShiftForDate, getFreeWindows, ShiftType } from './shiftUtils'

export type AssistantContext = {
  shift: { type: string; freeWindowStart: string; freeWindowEnd: string }
  deadlines: Array<{ title: string; daysLeft: number; priority: string; status: string }>
  recentSessions: Array<{ subject: string; date: string; duration: number; mood: string }>
  weakSpots: Array<{ topic: string; frequency: number; module: string }>
  topFrequencyChapters: Array<{ chapter: string; percentage: number }>
  energyPattern: { bestWindow: string; avgRating: number } | null
  pendingCaptures: number
}

export async function buildContext(
  supabase: SupabaseClient,
  userId: string
): Promise<AssistantContext> {
  const [shiftRes, deadRes, sessRes, weakRes, freqRes, captureRes] =
    await Promise.all([
      supabase.from('shift_configs').select('*').eq('user_id', userId).single(),
      supabase.from('deadlines').select('*').eq('user_id', userId).order('deadline_date', { ascending: true }).limit(5),
      supabase.from('study_sessions').select('*, exam:subject_id(name)').eq('user_id', userId).order('started_at', { ascending: false }).limit(7),
      supabase.from('weak_spots').select('*').eq('user_id', userId).eq('resolved', false).limit(5),
      supabase.from('chapter_frequency').select('*, section:section_id(title, section_number)').limit(5),
      supabase.from('quick_captures').select('id', { count: 'exact' }).eq('user_id', userId).eq('promoted', false),
    ])

  // Shift
  let shiftInfo = { type: 'unknown', freeWindowStart: '', freeWindowEnd: '' }
  if (shiftRes.data) {
    const shiftType = getShiftForDate(
      new Date(),
      new Date(shiftRes.data.cycle_start_date),
      shiftRes.data.first_shift_type as ShiftType
    )
    const windows = getFreeWindows(shiftType)
    shiftInfo = {
      type: shiftType,
      freeWindowStart: windows[0]?.start || '',
      freeWindowEnd: windows[0]?.end || '',
    }
  }

  // Deadlines
  const deadlines = (deadRes.data || []).map(d => ({
    title: d.title,
    daysLeft: d.deadline_date
      ? Math.ceil((new Date(d.deadline_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : -1,
    priority: d.priority || 'medium',
    status: d.status || 'not_started',
  }))

  // Recent sessions
  const recentSessions = (sessRes.data || []).map(s => ({
    subject: s.exam?.name || 'Manual Session',
    date: s.started_at ? new Date(s.started_at).toLocaleDateString() : 'N/A',
    duration: s.duration_minutes || 0,
    mood: s.energy_after ? `${s.energy_after}/5` : 'unknown',
  }))

  // Weak spots
  const weakSpots = (weakRes.data || []).map(w => ({
    topic: w.topic,
    frequency: w.frequency || 1,
    module: w.source || w.module || 'unknown',
  }))

  // Top frequency chapters
  const topFrequencyChapters = (freqRes.data || []).map(c => ({
    chapter: c.section?.title?.en || c.section?.title || 'Unknown',
    percentage: c.frequency_percentage || Math.round((c.appearance_count / (c.total_papers_analysed || 1)) * 100),
  }))

  let energyPattern: AssistantContext['energyPattern'] = null
  const highEnergySessions = (sessRes.data || []).filter(s => (s.energy_after || 0) >= 4)
  if (highEnergySessions.length > 0) {
    const avgHour = highEnergySessions.reduce((sum, s) => {
      return sum + (s.started_at ? new Date(s.started_at).getHours() : 14)
    }, 0) / highEnergySessions.length
    energyPattern = {
      bestWindow: `${Math.floor(avgHour)}:00–${Math.floor(avgHour) + 2}:00`,
      avgRating: Number((highEnergySessions.reduce((sum, s) => sum + (s.energy_after || 0), 0) / highEnergySessions.length).toFixed(1)),
    }
  }

  return {
    shift: shiftInfo,
    deadlines,
    recentSessions,
    weakSpots,
    topFrequencyChapters,
    energyPattern,
    pendingCaptures: captureRes.count || 0,
  }
}

export function contextToPrompt(ctx: AssistantContext): string {
  return `
=== USER CONTEXT ===
Shift today: ${ctx.shift.type} | Free window: ${ctx.shift.freeWindowStart}–${ctx.shift.freeWindowEnd}

Upcoming deadlines:
${ctx.deadlines.map(d => `- ${d.title}: ${d.daysLeft} days left [${d.priority}] (${d.status})`).join('\n') || '- None'}

Last 7 days study:
${ctx.recentSessions.map(s => `- ${s.subject}: ${s.duration}min on ${s.date} (energy: ${s.mood})`).join('\n') || '- No recent sessions'}

Weak spots (recurring mistakes):
${ctx.weakSpots.map(w => `- ${w.topic} (flagged ${w.frequency}x in ${w.module})`).join('\n') || '- None tracked'}

High-frequency exam chapters:
${ctx.topFrequencyChapters.map(c => `- ${c.chapter}: ${c.percentage}% of past papers`).join('\n') || '- No data yet'}

${ctx.energyPattern ? `Best study window: ${ctx.energyPattern.bestWindow} (avg energy: ${ctx.energyPattern.avgRating}/5)` : ''}
${ctx.pendingCaptures > 0 ? `User has ${ctx.pendingCaptures} unreviewed quick captures.` : ''}
=== END CONTEXT ===`
}
