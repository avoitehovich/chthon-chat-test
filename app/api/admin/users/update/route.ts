import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
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

    // Check if we're using database
    const dbCheck = await prisma.user.count()

    let updatedCount = 0

    if (dbCheck > 0) {
      // Update users in database
      const { tier, ...customConfig } = updates

      // Prepare the update data
      const updateData: any = {
        tier,
        updatedAt: new Date(),
      }

      // If this is a custom tier, store the configuration in a JSON field
      if (tier === "custom" && Object.keys(customConfig).length > 0) {
        updateData.tierConfig = customConfig
      }

      // Update the users
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: updateData,
      })

      updatedCount = result.count
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
