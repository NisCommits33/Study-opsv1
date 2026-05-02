/**
 * @file ThemeProvider.tsx
 * @description Wrapper for next-themes to provide dark/light mode context.
 * 
 * @author Study Ops Engineering
 */

'use client'

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ 
  children, 
  ...props 
}: any) {
  return <NextThemesProvider {...props} suppressHydrationWarning>{children}</NextThemesProvider>
}
