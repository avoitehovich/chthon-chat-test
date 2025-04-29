import { prisma } from "@/lib/db"

export async function initializeDatabase() {
  try {
    console.log("[DB-INIT] Starting database initialization...")

    // Create default admin settings if they don't exist
    const adminSettings = await prisma.adminSettings.findUnique({
      where: { id: "global" },
    })

    if (!adminSettings) {
      console.log("[DB-INIT] Creating default admin settings")
      await prisma.adminSettings.create({
        data: {
          id: "global",
          settings: {
            default_tier: "registered",
            allow_registration: true,
            maintenance_mode: false,
          },
        },
      })
    }

    console.log("[DB-INIT] Database initialization completed")
    return { success: true }
  } catch (error) {
    console.error("[DB-INIT] Database initialization failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
