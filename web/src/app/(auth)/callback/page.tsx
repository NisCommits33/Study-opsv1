/**
 * @file callback/page.tsx
 * @description Authentication callback handler.
 * Manages the transition after a successful OAuth login, directing
 * the user to onboarding or the dashboard based on their profile.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * AuthCallback Component.
 * Handles Supabase session verification and profile-based redirection.
 * Includes a Skeleton UI for the brief loading state.
 */
export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    /**
     * Logic to verify the session and redirect.
     */
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth error:', error.message)
        router.push('/login')
        return
      }

      if (data.session) {
        // Check profile status
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_done')
          .eq('id', data.session.user.id)
          .single()

        if (profile?.onboarding_done) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
      } else {
        router.push('/login')
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 p-8">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  )
}
