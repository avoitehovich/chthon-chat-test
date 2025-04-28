import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Re-export createClient for modules that need it directly
export { createClient }

// Create a single supabase client for the entire app
let supabaseBrowser: ReturnType<typeof createClient> | null = null
let supabaseServer: ReturnType<typeof createClient> | null = null

// Client-side Supabase client (with reduced capabilities)
export const getSupabaseBrowser = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("[SUPABASE] Missing Supabase environment variables for browser client")
    throw new Error("Missing Supabase environment variables")
  }

  if (supabaseBrowser) return supabaseBrowser

  console.log("[SUPABASE] Creating new browser client")
  supabaseBrowser = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  )

  return supabaseBrowser
}

// Server-side Supabase client (with full capabilities)
export const getSupabaseServer = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[SUPABASE] Missing Supabase environment variables for server client")
    throw new Error("Missing Supabase environment variables")
  }

  if (supabaseServer) return supabaseServer

  console.log("[SUPABASE] Creating new server client")
  supabaseServer = createClient<Database>(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseServer
}

// Check if Supabase is available
export const isSupabaseAvailable = async (): Promise<boolean> => {
  try {
    console.log("[SUPABASE] Checking availability")

    // Check if environment variables are available
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[SUPABASE] Missing environment variables")
      return false
    }

    const supabase = getSupabaseServer()

    // Set a timeout for the query
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.error("[SUPABASE] Connection timeout")
        resolve(null)
      }, 10000) // 10 second timeout
    })

    // Actual query
    const queryPromise = supabase.from("users").select("count").limit(1)

    // Race the query against the timeout
    const result = await Promise.race([queryPromise, timeoutPromise])

    if (result === null) {
      // Timeout occurred
      return false
    }

    const { data, error } = result as any

    if (error) {
      console.error("[SUPABASE] Connection error:", error.message)
      return false
    }

    console.log("[SUPABASE] Connection successful")
    return true
  } catch (error) {
    console.error("[SUPABASE] Availability check failed:", error instanceof Error ? error.message : String(error))
    return false
  }
}
