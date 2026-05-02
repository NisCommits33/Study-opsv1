/**
 * @file layout.tsx
 * @description Root layout for the Study Ops application.
 * Implements the new StudyOps design system with curated typography and color tokens.
 * 
 * @author Study Ops Engineering
 */

import type { Metadata } from "next";
import { DM_Serif_Display, Instrument_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { AssistantSidebar } from "@/components/AssistantSidebar";
import { AssistantToggle } from "@/components/AssistantToggle";
import { TimerProvider } from "@/components/TimerProvider";
import { Toaster } from 'sonner'

// Load fonts from the new design system
const displayFont = DM_Serif_Display({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Instrument_Sans({ 
  subsets: ["latin"],
  variable: "--font-body",
});

const monoFont = DM_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-mono",
});

/**
 * Global Metadata for SEO and Browser Branding.
 */
export const metadata: Metadata = {
  title: "Study Ops — Shift-Aware Exam Intelligence",
  description: "Advanced study assistant tailored for shift workers and Loksewa candidates.",
};

/**
 * Root Layout Component.
 * 
 * @param {Object} props - Component properties.
 * @param {React.ReactNode} props.children - Child components to be rendered within the layout.
 * @returns {JSX.Element} The rendered root layout.
 * 
 * @note The 'dark' class is applied by default as this is a dark-mode-first application.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`} style={{ colorScheme: 'dark' }}>
      <body className="antialiased selection:bg-saffron/30 font-body">
        <TimerProvider>
          {children}
        </TimerProvider>
        
        {/* Global UI Components */}
        <AssistantSidebar />
        <AssistantToggle />
        <Toaster position="bottom-right" richColors theme="dark" />
      </body>
    </html>
  );
}
