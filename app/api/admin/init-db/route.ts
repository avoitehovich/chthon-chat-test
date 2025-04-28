import { NextResponse } from "next/server"
import { initializeSupabase, migrateDataToSupabase } from "@/lib/init-supabase"

export async function POST(req: Request) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract the token
    const token = authHeader.substring(7)

    // Verify the token matches the admin key
    if (token !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "Invalid authorization token" }, { status: 401 })
    }

    // Initialize Supabase database
    const initialized = await initializeSupabase()

    if (!initialized) {
      return NextResponse.json({ error: "Failed to initialize database" }, { status: 500 })
    }

    // Migrate data from file-based storage to Supabase
    const migrated = await migrateDataToSupabase()

    return NextResponse.json({
      success: true,
      initialized,
      migrated,
    })
  } catch (error) {
    console.error("Error initializing database:", error)
    return NextResponse.json({ error: "Failed to initialize database" }, { status: 500 })
  }
}
