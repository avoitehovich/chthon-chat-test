import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

// Re-export createClient for use in other files
export { createClient }

// Create a singleton instance for client-side usage
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

// Function to get the Supabase URL and key from environment variables
const getSupabaseCredentials = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Missing Supabase credentials. Supabase functionality will be limited.")
    return { supabaseUrl: "", supabaseKey: "" }
  }

  return { supabaseUrl, supabaseKey }
}

// Create a Supabase client for server components
export const createServerClient = () => {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials()

  const cookieStore = cookies()

  return createClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

// Create a Supabase client for client components (singleton pattern)
export const getSupabaseClient = () => {
  if (supabaseClient) return supabaseClient

  const { supabaseUrl, supabaseKey } = getSupabaseCredentials()

  supabaseClient = createClient<Database>(supabaseUrl, supabaseKey)
  return supabaseClient
}

// Helper function to check if Supabase is available
export const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseCredentials()
    if (!supabaseUrl || !supabaseKey) {
      return false
    }

    const supabase = createServerClient()
    const { error } = await supabase.from("users").select("id").limit(1)

    if (error) {
      console.warn("Supabase is not available:", error.message)
      return false
    }

    return true
  } catch (error) {
    console.warn("Supabase is not available:", error)
    return false
  }
}

// Helper function to get Supabase client for server-side
export const getSupabaseServer = () => {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials()
  return createClient<Database>(supabaseUrl, supabaseKey)
}
