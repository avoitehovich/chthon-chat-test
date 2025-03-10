import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export async function GET() {
  try {
    // Simple query to check database connection
    const result = await sql`SELECT NOW()`
    return NextResponse.json({
      status: "healthy",
      timestamp: result.rows[0].now,
      message: "Database connection successful",
    })
  } catch (error) {
    console.error("Database health check failed:", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Database connection failed",
      },
      { status: 500 },
    )
  }
}

