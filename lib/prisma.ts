import { PrismaClient } from "@prisma/client"

// Check if we have the correct environment variables
const checkEnvVariables = () => {
  const requiredVars = ["CHTHON_POSTGRES_PRISMA_URL", "CHTHON_POSTGRES_URL_NON_POOLING"]

  const missingVars = requiredVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    console.warn(`Missing environment variables: ${missingVars.join(", ")}`)
    return false
  }

  return true
}

// Log the environment variables we're using (without exposing sensitive data)
const logEnvVariables = () => {
  console.log("Using CHTHON environment variables for database connection")

  // Only log that we have the variables, not their values
  if (process.env.CHTHON_POSTGRES_PRISMA_URL) {
    console.log("CHTHON_POSTGRES_PRISMA_URL is set")
  }

  if (process.env.CHTHON_POSTGRES_URL_NON_POOLING) {
    console.log("CHTHON_POSTGRES_URL_NON_POOLING is set")
  }
}

// Log environment variable status
checkEnvVariables()
logEnvVariables()

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
