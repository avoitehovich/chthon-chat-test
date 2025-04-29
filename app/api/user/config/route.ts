import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(req: Request) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions)

    // Get the userId from query params
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")

    // Check if the user is authorized to access this data
    if (!session || !session.user || session.user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try to get user from database
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, tierConfig: true },
    })

    if (userData) {
      return NextResponse.json({
        tier: userData.tier,
        tierConfig: userData.tierConfig || null,
      })
    }

    // Fall back to file-based storage
    const { getUserById } = await import("@/utils/user-service")
    const user = await getUserById(userId)

    if (user) {
      return NextResponse.json({
        tier: user.tier,
        tierConfig: user.tierConfig || null,
      })
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 })
  } catch (error) {
    console.error("Error fetching user config:", error)
    return NextResponse.json({ error: "Failed to fetch user configuration" }, { status: 500 })
  }
}
