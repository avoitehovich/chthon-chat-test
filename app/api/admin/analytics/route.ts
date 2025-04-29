import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

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

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (dbError) {
      console.error("Database connection test failed:", dbError)
      return NextResponse.json({ error: "Database connection failed", details: String(dbError) }, { status: 500 })
    }

    // Get analytics data
    const rawData = await prisma.analytics.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate summary
    const summary = {
      totalTokens: rawData.reduce((sum, item) => sum + item.tokens, 0),
      totalCost: rawData.reduce((sum, item) => sum + item.cost, 0),
      totalRequests: rawData.length,
      byProvider: {} as Record<string, { tokens: number; cost: number; requests: number }>,
      byModel: {} as Record<string, { tokens: number; cost: number; requests: number }>,
    }

    // Calculate by provider and model
    rawData.forEach((item) => {
      // By provider
      if (!summary.byProvider[item.provider]) {
        summary.byProvider[item.provider] = { tokens: 0, cost: 0, requests: 0 }
      }
      summary.byProvider[item.provider].tokens += item.tokens
      summary.byProvider[item.provider].cost += item.cost
      summary.byProvider[item.provider].requests += 1

      // By model
      if (!summary.byModel[item.model]) {
        summary.byModel[item.model] = { tokens: 0, cost: 0, requests: 0 }
      }
      summary.byModel[item.model].tokens += item.tokens
      summary.byModel[item.model].cost += item.cost
      summary.byModel[item.model].requests += 1
    })

    return NextResponse.json({ rawData, summary })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics data", details: String(error) }, { status: 500 })
  }
}
