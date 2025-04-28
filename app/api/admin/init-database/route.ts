import { NextResponse } from "next/server"
import { initializeDatabase } from "@/utils/init-database"

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

    // Initialize the database
    const result = await initializeDatabase()

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to initialize database",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
    })
  } catch (error) {
    console.error("Error initializing database:", error)
    return NextResponse.json(
      {
        error: `Failed to initialize database: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
