import { PrismaClient } from "@prisma/client"

/**
 * Creates a new PrismaClient instance or returns an existing one.
 * This approach prevents multiple PrismaClient instances during hot reloading in development.
 */
function createPrismaClient() {
  // Check if we're in a production environment
  const isProduction = process.env.NODE_ENV === "production"

  // Create a new PrismaClient instance
  const client = new PrismaClient({
    log: isProduction ? ["error"] : ["query", "error", "warn"],
    errorFormat: isProduction ? "minimal" : "pretty",
  })

  // Add middleware for connection handling
  client.$use(async (params, next) => {
    try {
      return await next(params)
    } catch (error) {
      // Handle connection errors
      if (
        error instanceof Error &&
        (error.message.includes("Connection pool") || error.message.includes("connection"))
      ) {
        console.error("Database connection error:", error)

        // You could implement retry logic here if needed
      }
      throw error
    }
  })

  return client
}

// Global type for PrismaClient
declare global {
  var prisma: PrismaClient | undefined
}

// Create or reuse PrismaClient
export const prisma = global.prisma || createPrismaClient()

// In development, preserve the client across hot reloads
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma
}
