import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Test the database connection with a simple query
    const result = await prisma.$executeRawUnsafe("SELECT 1 as test")

    // Try to get the users table info
    let tablesExist = false
    try {
      await prisma.$executeRawUnsafe("SELECT * FROM users LIMIT 1")
      tablesExist = true
    } catch (tableError) {
      console.error("Table check error:", tableError)
    }

    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      tablesExist,
      result,
    })
  } catch (error) {
    console.error("Database connection error:", error)

    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed",
        error: String(error),
      },
      { status: 500 },
    )
  }
}
