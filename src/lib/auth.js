import { supabase } from "./supabase"

export function buildLoginRedirectTo(origin = window.location.origin) {
  return `${origin}/`
}

export async function sendMagicLink(email, redirectTo = buildLoginRedirectTo()) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })

  if (error) {
    throw error
  }
}

export async function hasActiveSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return Boolean(data?.session)
}
