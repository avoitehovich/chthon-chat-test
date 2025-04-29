import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    // Check for environment variables
    const envVars = {
      CHTHON_POSTGRES_PRISMA_URL: !!process.env.CHTHON_POSTGRES_PRISMA_URL,
      CHTHON_POSTGRES_URL_NON_POOLING: !!process.env.CHTHON_POSTGRES_URL_NON_POOLING,
      // Include other CHTHON variables that might be available
      CHTHON_DATABASE_URL: !!process.env.CHTHON_DATABASE_URL,
      CHTHON_PGHOST: !!process.env.CHTHON_PGHOST,
      CHTHON_PGUSER: !!process.env.CHTHON_PGUSER,
      CHTHON_PGDATABASE: !!process.env.CHTHON_PGDATABASE,
    }

    // Simple query to test database connection
    let dbConnectionStatus = "unknown"
    let userCount = 0

    try {
      userCount = await prisma.user.count()
      dbConnectionStatus = "success"
    } catch (dbError) {
      dbConnectionStatus = "error"
      console.error("Database query error:", dbError)
    }

    return NextResponse.json({
      status: "success",
      message: "Environment check completed",
      environmentVariables: envVars,
      databaseConnection: dbConnectionStatus,
      userCount: dbConnectionStatus === "success" ? userCount : null,
    })
  } catch (error) {
    console.error("API route error:", error)

    return NextResponse.json(
      {
        status: "error",
        message: "API route failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
