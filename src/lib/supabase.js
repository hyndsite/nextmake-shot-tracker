import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export async function signInWithMagicLink(email){
  const { error } = await supabase.auth.signInWithOtp({ email })
  if (error) throw error
}
export async function signOut(){ await supabase.auth.signOut() }
export async function getUser(){
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}
