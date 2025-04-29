import { prisma } from "@/lib/db"
import { isDatabaseAvailable } from "@/lib/db"
import fs from "fs/promises"
import path from "path"
import type { UserTier } from "@/types/user"

// Define the analytics data structure
export interface AnalyticsData {
  provider: string
  type: "text" | "image"
  timestamp: string
  cost: number
  tokens: number
  processingTime: number
  success: boolean
  error: string | null
  userTier: UserTier
  userId: string
  // Add new fields for detailed analytics
  providerDetails?: {
    [key: string]: {
      cost: number
      tokens: number
      processingTime?: number
      model?: string
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
      completionTokensDetails?: {
        accepted_prediction_tokens?: number
        audio_tokens?: number
        reasoning_tokens?: number
        rejected_prediction_tokens?: number
      }
      promptTokensDetails?: {
        audio_tokens?: number
        cached_tokens?: number
      }
    }
  }
  responseTime?: number
  requestSize?: number
  responseSize?: number
}

// Change the ANALYTICS_FILE path to use the /tmp directory in production
const ANALYTICS_FILE =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "analytics.json")
    : path.join(process.cwd(), "data", "analytics.json")

// Update the ensureDataDir function to handle both development and production
async function ensureDataDir() {
  const dataDir = process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data")

  try {
    await fs.access(dataDir)
  } catch (error) {
    try {
      await fs.mkdir(dataDir, { recursive: true })
    } catch (mkdirError) {
      console.error(`Failed to create directory ${dataDir}:`, mkdirError)
      // In production, fall back to just using /tmp directly if we can't create a subdirectory
      if (process.env.NODE_ENV === "production") {
        return
      }
      throw mkdirError
    }
  }
}

// Save analytics data
export async function saveAnalytics(data: AnalyticsData): Promise<void> {
  try {
    console.log("[ANALYTICS] Saving analytics data:", {
      provider: data.provider,
      type: data.type,
      cost: data.cost,
      tokens: data.tokens,
      success: data.success,
      userTier: data.userTier,
      userId: data.userId,
      providerDetails: data.providerDetails ? Object.keys(data.providerDetails) : undefined,
    })

    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      // Convert to Prisma format
      await prisma.analytics.create({
        data: {
          userId: data.userId !== "anonymous" ? data.userId : null,
          provider: data.provider,
          type: data.type,
          timestamp: new Date(data.timestamp),
          cost: data.cost,
          tokens: data.tokens,
          processingTime: data.processingTime,
          success: data.success,
          error: data.error,
          userTier: data.userTier,
          // Add new fields
          providerDetails: data.providerDetails || null,
          responseTime: data.responseTime || null,
          requestSize: data.requestSize || null,
          responseSize: data.responseSize || null,
        },
      })

      console.log("[ANALYTICS] Successfully saved to database")
      return
    }

    // Fall back to file-based storage
    console.warn("[ANALYTICS] Falling back to file-based analytics storage")
    await ensureDataDir()

    let analytics: AnalyticsData[] = []

    try {
      const fileContent = await fs.readFile(ANALYTICS_FILE, "utf-8")
      analytics = JSON.parse(fileContent)
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      analytics = []
    }

    // Add new data
    analytics.push(data)

    // Write back to file
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(analytics, null, 2), "utf-8")
    console.log("[ANALYTICS] Successfully saved to file storage")
  } catch (error) {
    console.error("[ANALYTICS] Error saving analytics:", error)
  }
}

// Get all analytics data
export async function getAnalytics(): Promise<AnalyticsData[]> {
  try {
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      const analyticsData = await prisma.analytics.findMany({
        orderBy: { timestamp: "desc" },
      })

      // Convert to app format
      return analyticsData.map((item) => ({
        provider: item.provider,
        type: item.type as "text" | "image",
        timestamp: item.timestamp.toISOString(),
        cost: item.cost,
        tokens: item.tokens,
        processingTime: item.processingTime,
        success: item.success,
        error: item.error,
        userTier: item.userTier as UserTier,
        userId: item.userId || "anonymous",
        // Add new fields
        providerDetails: item.providerDetails as any,
        responseTime: item.responseTime || undefined,
        requestSize: item.requestSize || undefined,
        responseSize: item.responseSize || undefined,
      }))
    }

    // Fall back to file-based storage
    await ensureDataDir()

    try {
      const fileContent = await fs.readFile(ANALYTICS_FILE, "utf-8")
      return JSON.parse(fileContent)
    } catch (error) {
      // File doesn't exist or is invalid
      return []
    }
  } catch (error) {
    console.error("[ANALYTICS] Error getting analytics:", error)
    return []
  }
}

// Get analytics summary
export async function getAnalyticsSummary() {
  try {
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      // Get total requests
      const totalRequests = await prisma.analytics.count()

      // Get successful requests
      const successfulRequests = await prisma.analytics.count({
        where: { success: true },
      })

      // Get total cost and tokens
      const totals = (await prisma.$queryRaw`
        SELECT 
          SUM(cost)::float as total_cost,
          SUM(tokens)::int as total_tokens
        FROM analytics
      `) as any[]

      // Get provider stats
      const providerData = await prisma.analytics.findMany({
        select: { provider: true, success: true },
      })

      // Calculate provider stats
      const providerStats = providerData.reduce(
        (acc, item) => {
          if (!acc[item.provider]) {
            acc[item.provider] = {
              requests: 0,
              cost: 0,
              tokens: 0,
              successRate: 0,
            }
          }

          acc[item.provider].requests++

          return acc
        },
        {} as Record<string, { requests: number; cost: number; tokens: number; successRate: number }>,
      )

      // Get provider totals
      const providerTotals = (await prisma.$queryRaw`
        SELECT 
          provider,
          SUM(cost)::float as total_cost,
          SUM(tokens)::int as total_tokens
        FROM analytics
        GROUP BY provider
      `) as any[]

      // Update provider stats with totals
      for (const provider of providerTotals) {
        if (providerStats[provider.provider]) {
          providerStats[provider.provider].cost = provider.total_cost
          providerStats[provider.provider].tokens = provider.total_tokens
        }
      }

      // Calculate success rates for each provider
      for (const provider in providerStats) {
        const providerRequests = providerData.filter((item) => item.provider === provider)
        const providerSuccessful = providerRequests.filter((item) => item.success).length
        providerStats[provider].successRate =
          providerRequests.length > 0 ? (providerSuccessful / providerRequests.length) * 100 : 0
      }

      // Get type stats
      const typeData = (await prisma.$queryRaw`
        SELECT 
          type,
          COUNT(*)::int as count,
          SUM(cost)::float as total_cost,
          SUM(tokens)::int as total_tokens
        FROM analytics
        GROUP BY type
      `) as any[]

      const typeStats = {
        text: {
          requests: 0,
          cost: 0,
          tokens: 0,
        },
        image: {
          requests: 0,
          cost: 0,
          tokens: 0,
        },
      }

      for (const type of typeData) {
        if (type.type === "text" || type.type === "image") {
          typeStats[type.type].requests = type.count
          typeStats[type.type].cost = type.total_cost
          typeStats[type.type].tokens = type.total_tokens
        }
      }

      // Get tier stats
      const tierData = (await prisma.$queryRaw`
        SELECT 
          user_tier,
          COUNT(*)::int as count,
          SUM(cost)::float as total_cost,
          SUM(tokens)::int as total_tokens
        FROM analytics
        GROUP BY user_tier
      `) as any[]

      const tierStats = tierData.reduce(
        (acc, item) => {
          const tier = item.user_tier || "anonymous"
          acc[tier] = {
            requests: item.count,
            cost: item.total_cost,
            tokens: item.total_tokens,
          }
          return acc
        },
        {} as Record<string, { requests: number; cost: number; tokens: number }>,
      )

      // Get daily usage
      const dailyData = (await prisma.$queryRaw`
        SELECT 
          TO_CHAR(timestamp, 'YYYY-MM-DD') as date,
          COUNT(*)::int as count,
          SUM(cost)::float as total_cost,
          SUM(tokens)::int as total_tokens
        FROM analytics
        GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD')
        ORDER BY date DESC
      `) as any[]

      const dailyUsage = dailyData.reduce(
        (acc, item) => {
          const date = item.date
          acc[date] = {
            requests: item.count,
            cost: item.total_cost,
            tokens: item.total_tokens,
          }
          return acc
        },
        {} as Record<string, { requests: number; cost: number; tokens: number }>,
      )

      // Get provider details summary
      const analytics = await prisma.analytics.findMany({
        where: {
          providerDetails: { not: null },
        },
        select: { providerDetails: true },
        take: 100,
      })

      const providerDetailsSummary = {} as Record<string, { cost: number; tokens: number; requests: number }>

      // Process provider details
      for (const item of analytics) {
        if (item.providerDetails) {
          for (const [provider, details] of Object.entries(item.providerDetails as any)) {
            if (!providerDetailsSummary[provider]) {
              providerDetailsSummary[provider] = { cost: 0, tokens: 0, requests: 0 }
            }

            providerDetailsSummary[provider].requests++

            if (typeof details === "object") {
              providerDetailsSummary[provider].cost += (details as any).cost || 0
              providerDetailsSummary[provider].tokens += (details as any).tokens || 0
            }
          }
        }
      }

      return {
        totalCost: totals[0]?.total_cost || 0,
        totalTokens: totals[0]?.total_tokens || 0,
        totalRequests: totalRequests || 0,
        successfulRequests: successfulRequests || 0,
        failedRequests: (totalRequests || 0) - (successfulRequests || 0),
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        providerStats,
        typeStats,
        tierStats,
        dailyUsage,
        providerDetailsSummary,
      }
    }

    // Fall back to file-based analytics summary
    const analytics = await getAnalytics()

    // Calculate totals
    const totalCost = analytics.reduce((sum, item) => sum + item.cost, 0)
    const totalTokens = analytics.reduce((sum, item) => sum + item.tokens, 0)
    const totalRequests = analytics.length
    const successfulRequests = analytics.filter((item) => item.success).length
    const failedRequests = totalRequests - successfulRequests

    // Group by provider
    const providerStats = analytics.reduce(
      (acc, item) => {
        if (!acc[item.provider]) {
          acc[item.provider] = {
            requests: 0,
            cost: 0,
            tokens: 0,
            successRate: 0,
          }
        }

        acc[item.provider].requests++
        acc[item.provider].cost += item.cost
        acc[item.provider].tokens += item.tokens

        return acc
      },
      {} as Record<string, { requests: number; cost: number; tokens: number; successRate: number }>,
    )

    // Calculate success rates for each provider
    Object.keys(providerStats).forEach((provider) => {
      const providerRequests = analytics.filter((item) => item.provider === provider)
      const providerSuccessful = providerRequests.filter((item) => item.success).length
      providerStats[provider].successRate =
        providerRequests.length > 0 ? (providerSuccessful / providerRequests.length) * 100 : 0
    })

    // Group by type (text vs image)
    const typeStats = {
      text: {
        requests: analytics.filter((item) => item.type === "text").length,
        cost: analytics.filter((item) => item.type === "text").reduce((sum, item) => sum + item.cost, 0),
        tokens: analytics.filter((item) => item.type === "text").reduce((sum, item) => sum + item.tokens, 0),
      },
      image: {
        requests: analytics.filter((item) => item.type === "image").length,
        cost: analytics.filter((item) => item.type === "image").reduce((sum, item) => sum + item.cost, 0),
        tokens: analytics.filter((item) => item.type === "image").reduce((sum, item) => sum + item.tokens, 0),
      },
    }

    // Group by user tier
    const tierStats = analytics.reduce(
      (acc, item) => {
        if (!acc[item.userTier]) {
          acc[item.userTier] = {
            requests: 0,
            cost: 0,
            tokens: 0,
          }
        }

        acc[item.userTier].requests++
        acc[item.userTier].cost += item.cost
        acc[item.userTier].tokens += item.tokens

        return acc
      },
      {} as Record<string, { requests: number; cost: number; tokens: number }>,
    )

    // Get daily usage
    const dailyUsage = analytics.reduce(
      (acc, item) => {
        const date = item.timestamp.split("T")[0]
        if (!acc[date]) {
          acc[date] = {
            requests: 0,
            cost: 0,
            tokens: 0,
          }
        }

        acc[date].requests++
        acc[date].cost += item.cost
        acc[date].tokens += item.tokens

        return acc
      },
      {} as Record<string, { requests: number; cost: number; tokens: number }>,
    )

    // Process provider details
    const providerDetailsSummary = {} as Record<string, { cost: number; tokens: number; requests: number }>

    for (const item of analytics) {
      if (item.providerDetails) {
        for (const [provider, details] of Object.entries(item.providerDetails)) {
          if (!providerDetailsSummary[provider]) {
            providerDetailsSummary[provider] = { cost: 0, tokens: 0, requests: 0 }
          }

          providerDetailsSummary[provider].requests++

          if (typeof details === "object") {
            providerDetailsSummary[provider].cost += (details as any).cost || 0
            providerDetailsSummary[provider].tokens += (details as any).tokens || 0
          }
        }
      }
    }

    return {
      totalCost,
      totalTokens,
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      providerStats,
      typeStats,
      tierStats,
      dailyUsage,
      providerDetailsSummary,
    }
  } catch (error) {
    console.error("[ANALYTICS] Error getting analytics summary:", error)
    return {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0,
      providerStats: {},
      typeStats: {
        text: { requests: 0, cost: 0, tokens: 0 },
        image: { requests: 0, cost: 0, tokens: 0 },
      },
      tierStats: {},
      dailyUsage: {},
      providerDetailsSummary: {},
    }
  }
}
