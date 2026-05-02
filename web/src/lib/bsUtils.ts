/**
 * @file lib/bsUtils.ts
 * @description Bikram Sambat (BS) ↔ AD date converter utilities.
 */

import NepaliDate from 'nepali-date-converter'

/**
 * Converts a Gregorian (AD) date to a Nepali (BS) formatted string.
 * @example adToBS(new Date()) → "Jestha 16, 2083"
 */
export function adToBS(date: Date): string {
  try {
    const nd = new NepaliDate(date)
    return nd.format('MMMM DD, YYYY')
  } catch {
    return 'Invalid Date'
  }
}

/**
 * Converts a Nepali (BS) date to a Gregorian (AD) Date object.
 */
export function bsToAD(bsYear: number, bsMonth: number, bsDay: number): Date {
  try {
    const nd = new NepaliDate(bsYear, bsMonth - 1, bsDay)
    return nd.toJsDate()
  } catch {
    return new Date()
  }
}

/**
 * Returns both AD and BS formatted strings for display.
 * @example dualDate(new Date()) → "Jestha 16, 2083 (May 29, 2026)"
 */
export function dualDate(date: Date): string {
  const bs = adToBS(date)
  const ad = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return `${bs} (${ad})`
}
