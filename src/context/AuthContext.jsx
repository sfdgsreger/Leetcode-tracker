import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch the public.users profile for a given auth user
  async function fetchProfile(authUser) {
    if (!authUser) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!error) setProfile(data)
    // If the trigger hasn't fired yet (race condition on first sign-up),
    // we retry once after a short delay.
    else if (error.code === 'PGRST116') {
      setTimeout(async () => {
        const { data: retryData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        if (retryData) setProfile(retryData)
      }, 1500)
    }
  }

  useEffect(() => {
    // Get the initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ?? null
      setUser(authUser)
      fetchProfile(authUser).finally(() => setLoading(false))
    })

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const authUser = session?.user ?? null
        setUser(authUser)
        fetchProfile(authUser)
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auth helpers ─────────────────────────────────────────

  async function signUp({ email, password, displayName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })
    return { data, error }
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }

  async function updateDisplayName(displayName) {
    const { error } = await supabase
      .from('users')
      .update({ display_name: displayName })
      .eq('id', user.id)
    if (!error) setProfile((prev) => ({ ...prev, display_name: displayName }))
    return { error }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateDisplayName,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook — throws if used outside AuthProvider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
