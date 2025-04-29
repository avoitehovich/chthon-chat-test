import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    // Test the database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`

    return NextResponse.json({
      status: "success",
      message: "Prisma client initialized successfully",
      result,
    })
  } catch (error) {
    console.error("Prisma client initialization error:", error)

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to initialize Prisma client",
        error: String(error),
      },
      { status: 500 },
    )
  }
}
