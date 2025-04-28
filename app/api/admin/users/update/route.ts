import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase"
import type { UserTier } from "@/types/user"

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

    // Parse request body
    const { userIds, updates } = await req.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "No user IDs provided" }, { status: 400 })
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = getSupabaseServer()

    // Check if we're using Supabase
    const { data: supabaseCheck } = await supabase.from("users").select("count").limit(1).single()

    let updatedCount = 0

    if (supabaseCheck) {
      // Update users in Supabase
      const { tier, ...customConfig } = updates

      // Prepare the update data
      const updateData: any = {
        tier,
        updated_at: new Date().toISOString(),
      }

      // If this is a custom tier, store the configuration in a JSON field
      if (tier === "custom" && Object.keys(customConfig).length > 0) {
        updateData.tier_config = customConfig
      }

      // Update the users
      const { data, error } = await supabase.from("users").update(updateData).in("id", userIds).select("id")

      if (error) {
        console.error("Error updating users in Supabase:", error)
        return NextResponse.json({ error: "Failed to update users" }, { status: 500 })
      }

      updatedCount = data?.length || 0
    } else {
      // Fall back to file-based storage
      const { getUserById, updateUser } = await import("@/utils/user-service")

      // Update each user
      for (const userId of userIds) {
        const user = await getUserById(userId)
        if (user) {
          await updateUser(userId, {
            tier: updates.tier as UserTier,
            // If we have custom config, store it in a tierConfig field
            ...(updates.tier === "custom" ? { tierConfig: updates } : {}),
          })
          updatedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
    })
  } catch (error) {
    console.error("Error in admin users update API:", error)
    return NextResponse.json({ error: "Failed to update users" }, { status: 500 })
  }
}
