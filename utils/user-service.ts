import { prisma, isDatabaseAvailable } from "@/lib/db"
import fs from "fs/promises"
import path from "path"
import type { User, UserTier } from "@/types/user"
import crypto from "crypto"

// Change the USERS_FILE path to use the /tmp directory in production
const USERS_FILE =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "users.json")
    : path.join(process.cwd(), "data", "users.json")

// Update the ensureDataDir function to handle both development and production
async function ensureDataDir() {
  const dataDir = process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data")

  try {
    console.log("[USER-SERVICE] Checking data directory:", dataDir)
    await fs.access(dataDir)
    console.log("[USER-SERVICE] Data directory exists")
  } catch (error) {
    try {
      console.log("[USER-SERVICE] Creating data directory:", dataDir)
      await fs.mkdir(dataDir, { recursive: true })
      console.log("[USER-SERVICE] Data directory created successfully")
    } catch (mkdirError) {
      console.error(`[USER-SERVICE] Failed to create directory ${dataDir}:`, mkdirError)
      // In production, fall back to just using /tmp directly if we can't create a subdirectory
      if (process.env.NODE_ENV === "production") {
        console.log("[USER-SERVICE] In production, continuing without creating directory")
        return
      }
      throw mkdirError
    }
  }
}

// Convert Prisma User to our User type
function convertPrismaUser(prismaUser: any): User {
  return {
    id: prismaUser.id,
    email: prismaUser.email || "",
    name: prismaUser.name || "",
    image: prismaUser.image,
    tier: (prismaUser.tier as UserTier) || "free",
    tierConfig: prismaUser.tierConfig || undefined,
    createdAt: prismaUser.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: prismaUser.updatedAt?.toISOString() || new Date().toISOString(),
  }
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  try {
    console.log("[USER-SERVICE] Getting all users")
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      console.log("[USER-SERVICE] Using Prisma to get users")
      try {
        const users = await prisma.user.findMany()
        console.log("[USER-SERVICE] Retrieved", users.length, "users from database")
        return users.map(convertPrismaUser)
      } catch (dbError) {
        console.error("[USER-SERVICE] Error querying users from database:", dbError)
        // Fall back to file-based storage
      }
    }

    // Fall back to file-based storage
    console.warn("[USER-SERVICE] Falling back to file-based user storage")
    await ensureDataDir()

    try {
      console.log("[USER-SERVICE] Reading users file:", USERS_FILE)
      const fileContent = await fs.readFile(USERS_FILE, "utf-8")
      const users = JSON.parse(fileContent)
      console.log("[USER-SERVICE] Retrieved", users.length, "users from file")
      return users
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        console.log("[USER-SERVICE] Users file doesn't exist, returning empty array")
        return []
      }
      console.error("[USER-SERVICE] Error reading users file:", error)
      // File doesn't exist or is invalid
      return []
    }
  } catch (error) {
    console.error("[USER-SERVICE] Error getting users:", error)
    return []
  }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    console.log("[USER-SERVICE] Getting user by email:", email)
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      console.log("[USER-SERVICE] Using Prisma to get user by email")
      try {
        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          console.log("[USER-SERVICE] No user found with email:", email)
          return null
        }

        console.log("[USER-SERVICE] User found in database")
        return convertPrismaUser(user)
      } catch (dbError) {
        console.error("[USER-SERVICE] Error querying user by email from database:", dbError)
        // Fall back to file-based storage
      }
    }

    // Fall back to file-based storage
    console.log("[USER-SERVICE] Falling back to file-based storage for user by email")
    const users = await getAllUsers()
    const user = users.find((user) => user.email === email)
    console.log("[USER-SERVICE] User found in file storage:", !!user)
    return user || null
  } catch (error) {
    console.error(`[USER-SERVICE] Error getting user by email (${email}):`, error)
    return null
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
  try {
    console.log("[USER-SERVICE] Getting user by id:", id)
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      console.log("[USER-SERVICE] Using Prisma to get user by id")
      try {
        const user = await prisma.user.findUnique({
          where: { id },
        })

        if (!user) {
          console.log("[USER-SERVICE] No user found with id:", id)
          return null
        }

        console.log("[USER-SERVICE] User found in database")
        return convertPrismaUser(user)
      } catch (dbError) {
        console.error("[USER-SERVICE] Error querying user by id from database:", dbError)
        // Fall back to file-based storage
      }
    }

    // Fall back to file-based storage
    console.log("[USER-SERVICE] Falling back to file-based storage for user by id")
    const users = await getAllUsers()
    const user = users.find((user) => user.id === id)
    console.log("[USER-SERVICE] User found in file storage:", !!user)
    return user || null
  } catch (error) {
    console.error(`[USER-SERVICE] Error getting user by id (${id}):`, error)
    return null
  }
}

// Create a new user
export async function createUser(user: User): Promise<void> {
  try {
    console.log("[USER-SERVICE] Creating user:", user.email)
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      console.log("[USER-SERVICE] Using Prisma to create user")
      try {
        // Convert string ID to UUID if needed
        let userId = user.id
        if (
          typeof userId === "string" &&
          !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        ) {
          // Generate a UUID if the ID is not already in UUID format
          userId = crypto.randomUUID()
          console.log("[USER-SERVICE] Generated UUID for user:", userId)
        }

        await prisma.user.create({
          data: {
            id: userId,
            email: user.email,
            name: user.name,
            image: user.image,
            tier: user.tier || "free",
            tierConfig: user.tierConfig || null,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
        })

        console.log("[USER-SERVICE] User created in database")
        return
      } catch (dbError) {
        console.error("[USER-SERVICE] Error creating user in database:", dbError)
        // Fall back to file-based storage
      }
    }

    // Fall back to file-based storage
    console.log("[USER-SERVICE] Falling back to file-based storage for user creation")
    await ensureDataDir()
    const users = await getAllUsers()
    users.push(user)
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8")
    console.log("[USER-SERVICE] User created in file storage")
  } catch (error) {
    console.error(`[USER-SERVICE] Error creating user (${user.email}):`, error)
  }
}

// Update an existing user
export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  try {
    console.log("[USER-SERVICE] Updating user:", id)
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      console.log("[USER-SERVICE] Using Prisma to update user")
      try {
        const updateData: any = {}
        if (updates.name !== undefined) updateData.name = updates.name
        if (updates.email !== undefined) updateData.email = updates.email
        if (updates.image !== undefined) updateData.image = updates.image
        if (updates.tier !== undefined) updateData.tier = updates.tier
        if (updates.tierConfig !== undefined) updateData.tierConfig = updates.tierConfig
        if (updates.updatedAt !== undefined) updateData.updatedAt = new Date(updates.updatedAt)
        else updateData.updatedAt = new Date()

        await prisma.user.update({
          where: { id },
          data: updateData,
        })

        console.log("[USER-SERVICE] User updated in database")
        return
      } catch (dbError) {
        console.error("[USER-SERVICE] Error updating user in database:", dbError)
        // Fall back to file-based storage
      }
    }

    // Fall back to file-based storage
    console.log("[USER-SERVICE] Falling back to file-based storage for user update")
    await ensureDataDir()
    const users = await getAllUsers()
    const updatedUsers = users.map((user) => (user.id === id ? { ...user, ...updates } : user))
    await fs.writeFile(USERS_FILE, JSON.stringify(updatedUsers, null, 2), "utf-8")
    console.log("[USER-SERVICE] User updated in file storage")
  } catch (error) {
    console.error(`[USER-SERVICE] Error updating user (${id}):`, error)
  }
}
