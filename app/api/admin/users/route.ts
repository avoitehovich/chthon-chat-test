import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase"

export async function GET(req: Request) {
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

    // Initialize Supabase client
    const supabase = getSupabaseServer()

    // Fetch users from Supabase
    const { data: users, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    // If Supabase is not set up yet, fall back to the file-based storage
    if (!users || users.length === 0) {
      // Import the file-based user service
      const { getAllUsers } = await import("@/utils/user-service")
      const fileUsers = await getAllUsers()

      return NextResponse.json({ users: fileUsers })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error in admin users API:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
