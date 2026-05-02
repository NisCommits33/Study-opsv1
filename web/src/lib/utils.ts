/**
 * @file utils.ts
 * @description Core utility functions for the application.
 * Includes Tailwind CSS class merging logic.
 * 
 * @author Study Ops Engineering
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges multiple Tailwind CSS classes and handles conflicts safely.
 * 
 * @param {...ClassValue} inputs - Array of class names or conditional class objects.
 * @returns {string} The merged and optimized class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
