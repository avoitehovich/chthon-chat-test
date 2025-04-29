import { PrismaClient } from "@prisma/client"

// Add prisma to the NodeJS global type
declare global {
  var prisma: PrismaClient | undefined
}

// Prevent multiple instances of Prisma Client in development
export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") global.prisma = prisma

// Check if database is available
export async function isDatabaseAvailable() {
  try {
    console.log("[DB] Checking database availability...")
    // Simple query to check if database is available
    await prisma.$queryRaw`SELECT 1`
    console.log("[DB] Database is available")
    return true
  } catch (error) {
    console.error("[DB] Database availability check failed:", error)
    return false
  }
}

// Initialize database
export async function initDatabase() {
  try {
    console.log("[DB] Initializing database...")
    // Check if database is available
    const available = await isDatabaseAvailable()
    if (!available) {
      console.error("[DB] Database is not available")
      return false
    }

    console.log("[DB] Database initialized successfully")
    return true
  } catch (error) {
    console.error("[DB-INIT] Database initialization failed:", error)
    return false
  }
}
