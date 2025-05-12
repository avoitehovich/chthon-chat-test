import { getSupabaseServer, isSupabaseAvailable } from "@/lib/supabase"
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
      serviceTier?: string
      id?: string
      created?: number
      systemFingerprint?: string
      object?: string
      finishReason?: string
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

    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      const supabase = getSupabaseServer()

      // Convert to Supabase format
      const supabaseData = {
        user_id: data.userId !== "anonymous" ? data.userId : null,
        provider: data.provider,
        type: data.type,
        timestamp: data.timestamp,
        cost: data.cost,
        tokens: data.tokens,
        processing_time: data.processingTime,
        success: data.success,
        error: data.error,
        user_tier: data.userTier,
        // Add new fields
        provider_details: data.providerDetails || null,
        response_time: data.responseTime || null,
        request_size: data.requestSize || null,
        response_size: data.responseSize || null,
      }

      const { error } = await supabase.from("analytics").insert(supabaseData)

      if (error) {
        console.error("[ANALYTICS] Error saving analytics to Supabase:", error)
        throw error
      }

      console.log("[ANALYTICS] Successfully saved to Supabase")
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
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      const supabase = getSupabaseServer()
      const { data, error } = await supabase.from("analytics").select("*").order("timestamp", { ascending: false })

      if (error) {
        console.error("[ANALYTICS] Error fetching analytics from Supabase:", error)
        throw error
      }

      // Convert to app format
      return data.map((item) => ({
        provider: item.provider,
        type: item.type as "text" | "image",
        timestamp: item.timestamp,
        cost: item.cost,
        tokens: item.tokens,
        processingTime: item.processing_time,
        success: item.success,
        error: item.error,
        userTier: item.user_tier as UserTier,
        userId: item.user_id || "anonymous",
        // Add new fields
        providerDetails: item.provider_details,
        responseTime: item.response_time,
        requestSize: item.request_size,
        responseSize: item.response_size,
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
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      const supabase = getSupabaseServer()

      // Get total requests
      const { count: totalRequests, error: countError } = await supabase.from("analytics").count()

      if (countError) {
        console.error("[ANALYTICS] Error counting analytics from Supabase:", countError)
        throw countError
      }

      // Get successful requests
      const { count: successfulRequests, error: successError } = await supabase
        .from("analytics")
        .count()
        .eq("success", true)

      if (successError) {
        console.error("[ANALYTICS] Error counting successful analytics from Supabase:", successError)
        throw successError
      }

      // Get total cost and tokens
      const { data: totals, error: totalsError } = await supabase.rpc("get_analytics_totals")

      if (totalsError) {
        console.error("[ANALYTICS] Error getting analytics totals from Supabase:", totalsError)
        throw totalsError
      }

      // Get provider stats
      const { data: providerData, error: providerError } = await supabase.from("analytics").select("provider, success")

      if (providerError) {
        console.error("[ANALYTICS] Error getting provider stats from Supabase:", providerError)
        throw providerError
      }

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
      const { data: providerTotals, error: providerTotalsError } = await supabase.rpc("get_provider_totals")

      if (providerTotalsError) {
        console.error("[ANALYTICS] Error getting provider totals from Supabase:", providerTotalsError)
        throw providerTotalsError
      }

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
      const { data: typeData, error: typeError } = await supabase.rpc("get_type_totals")

      if (typeError) {
        console.error("[ANALYTICS] Error getting type stats from Supabase:", typeError)
        throw typeError
      }

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
      const { data: tierData, error: tierError } = await supabase.rpc("get_tier_totals")

      if (tierError) {
        console.error("[ANALYTICS] Error getting tier stats from Supabase:", tierError)
        throw tierError
      }

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
      const { data: dailyData, error: dailyError } = await supabase.rpc("get_daily_usage")

      if (dailyError) {
        console.error("[ANALYTICS] Error getting daily usage from Supabase:", dailyError)
        throw dailyError
      }

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
      const { data: analytics, error: analyticsError } = await supabase
        .from("analytics")
        .select("provider_details")
        .not("provider_details", "is", null)
        .limit(100)

      const providerDetailsSummary = {} as Record<string, { cost: number; tokens: number; requests: number }>

      if (!analyticsError && analytics) {
        // Process provider details
        for (const item of analytics) {
          if (item.provider_details) {
            for (const [provider, details] of Object.entries(item.provider_details)) {
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
      }

      return {
        totalCost: totals.total_cost || 0,
        totalTokens: totals.total_tokens || 0,
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
    let totalCost = analytics.reduce((sum, item) => sum + item.cost, 0)
    let totalTokens = analytics.reduce((sum, item) => sum + item.tokens, 0)
    let totalRequests = analytics.length
    let successfulRequests = analytics.filter((item) => item.success).length
    let failedRequests = totalRequests - successfulRequests

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

    // Also update the main analytics totals based on provider details
    let detailsTotalCost = 0
    let detailsTotalTokens = 0
    let detailsTotalRequests = 0

    for (const item of analytics) {
      if (item.providerDetails && Object.keys(item.providerDetails).length > 0) {
        detailsTotalRequests++

        for (const [provider, details] of Object.entries(item.providerDetails)) {
          if (!providerDetailsSummary[provider]) {
            providerDetailsSummary[provider] = { cost: 0, tokens: 0, requests: 0 }
          }

          providerDetailsSummary[provider].requests++

          if (typeof details === "object") {
            const detailCost = (details as any).cost || 0
            const detailTokens =
              (details as any).totalTokens ||
              ((details as any).promptTokens || 0) + ((details as any).completionTokens || 0) ||
              (details as any).tokens ||
              0

            providerDetailsSummary[provider].cost += detailCost
            providerDetailsSummary[provider].tokens += detailTokens

            detailsTotalCost += detailCost
            detailsTotalTokens += detailTokens
          }
        }
      }
    }

    // If we have provider details but the main totals are zero, use the details totals
    if (detailsTotalRequests > 0 && totalRequests === 0) {
      totalRequests = detailsTotalRequests
      successfulRequests = detailsTotalRequests // Assume successful if we have details
      failedRequests = 0
    }

    if (detailsTotalCost > 0 && totalCost === 0) {
      totalCost = detailsTotalCost
    }

    if (detailsTotalTokens > 0 && totalTokens === 0) {
      totalTokens = detailsTotalTokens
    }

    // Update provider stats with data from provider details if needed
    if (Object.keys(providerDetailsSummary).length > 0 && Object.keys(providerStats).length === 0) {
      for (const [provider, details] of Object.entries(providerDetailsSummary)) {
        providerStats[provider] = {
          requests: details.requests,
          cost: details.cost,
          tokens: details.tokens,
          successRate: 100, // Assume 100% success rate if we have details
        }
      }
    }

    // Update type stats if needed
    if (typeStats.text.requests === 0 && typeStats.image.requests === 0 && detailsTotalRequests > 0) {
      typeStats.text.requests = detailsTotalRequests
      typeStats.text.cost = detailsTotalCost
      typeStats.text.tokens = detailsTotalTokens
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
