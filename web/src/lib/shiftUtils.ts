/**
 * @file shiftUtils.ts
 * @description Utilities for calculating shift-related data.
 * Handles cycle rotations and identifies free study windows.
 * 
 * @author Study Ops Engineering
 */

import NepaliDate from 'nepali-date-converter'

export type ShiftType = 'morning' | 'day' | 'night' | 'off'

/**
 * Calculates the shift for a given date based on a cycle start.
 * 
 * @param {Date} targetDate - The date to check.
 * @param {Date} cycleStartDate - The date the cycle began.
 * @param {ShiftType} firstShift - The shift type on the cycle start date.
 * @returns {ShiftType} The calculated shift type.
 */
export function getShiftForDate(
  targetDate: Date,
  cycleStartDate: Date,
  firstShift: ShiftType = 'morning'
): ShiftType {
  const diffTime = targetDate.getTime() - cycleStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  // Standard 4-day rotation: Morning -> Day -> Night -> Off
  const cycle = ['morning', 'day', 'night', 'off'] as ShiftType[]
  const startIndex = cycle.indexOf(firstShift)
  
  const cycleIndex = (startIndex + diffDays) % cycle.length
  return cycle[cycleIndex >= 0 ? cycleIndex : (cycle.length + cycleIndex)]
}

/**
 * Determines the free study window based on the shift type.
 * 
 * @param {ShiftType} shift - The current shift.
 * @returns {{ start: string, end: string, label: string }[]} Array of free time windows.
 */
export function getFreeWindows(shift: ShiftType) {
  switch (shift) {
    case 'morning':
      return [{ start: '15:00', end: '22:00', label: 'Post-Shift Study' }]
    case 'day':
      return [{ start: '07:00', end: '13:00', label: 'Pre-Shift Study' }]
    case 'night':
      return [{ start: '10:00', end: '18:00', label: 'Sleep & Study' }]
    case 'off':
      return [{ start: '08:00', end: '22:00', label: 'Full Study Day' }]
    default:
      return []
  }
}

/**
 * Formats a Gregorian date to a Nepali date string.
 * 
 * @param {Date} date - The date to format.
 * @returns {string} The formatted Nepali date string (e.g., "2081-01-01").
 */
export function formatNepaliDate(date: Date): string {
  const npDate = new NepaliDate(date)
  return npDate.format('YYYY-MM-DD')
}
