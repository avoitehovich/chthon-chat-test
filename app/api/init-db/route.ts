import { NextResponse } from "next/server"
import { initDatabase } from "@/lib/db"

export async function GET() {
  try {
    const result = await initDatabase()
    if (result.success) {
      return NextResponse.json({ success: true, message: "Database initialized successfully" })
    } else {
      return NextResponse.json({ error: "Failed to initialize database", details: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error("Error initializing database:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

