import { getSupabaseServer, isSupabaseAvailable } from "@/lib/supabase"
import fs from "fs/promises"
import path from "path"
import type { User, UserTier } from "@/types/user"
import bcrypt from "bcryptjs"

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

// Update the convertSupabaseUser function to use snake_case column names
function convertSupabaseUser(supabaseUser: any): User {
  return {
    id: supabaseUser.id, // This will now be a UUID
    email: supabaseUser.email,
    name: supabaseUser.name || "",
    image: supabaseUser.image,
    password: supabaseUser.password || undefined,
    tier: supabaseUser.tier as UserTier,
    tierConfig: supabaseUser.tier_config || undefined,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at,
  }
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  try {
    console.log("[USER-SERVICE] Getting all users")
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      console.log("[USER-SERVICE] Using Supabase to get users")
      const supabase = getSupabaseServer()
      const { data: users, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("[USER-SERVICE] Error fetching users from Supabase:", error)
        throw error
      }

      console.log("[USER-SERVICE] Retrieved", users.length, "users from Supabase")
      return users.map(convertSupabaseUser)
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
      if (error.code === "ENOENT") {
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
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      console.log("[USER-SERVICE] Using Supabase to get user by email")
      const supabase = getSupabaseServer()
      const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single()

      if (error) {
        if (error.code === "PGRST116") {
          console.log("[USER-SERVICE] No user found with email:", email)
          // No rows returned
          return null
        }
        console.error("[USER-SERVICE] Error fetching user by email from Supabase:", error)
        throw error
      }

      console.log("[USER-SERVICE] User found in Supabase")
      return convertSupabaseUser(user)
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
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      console.log("[USER-SERVICE] Using Supabase to get user by id")
      const supabase = getSupabaseServer()
      const { data: user, error } = await supabase.from("users").select("*").eq("id", id).single()

      if (error) {
        if (error.code === "PGRST116") {
          console.log("[USER-SERVICE] No user found with id:", id)
          // No rows returned
          return null
        }
        console.error("[USER-SERVICE] Error fetching user by id from Supabase:", error)
        throw error
      }

      console.log("[USER-SERVICE] User found in Supabase")
      return convertSupabaseUser(user)
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

// Update the createUser function to handle UUID
export async function createUser(user: User): Promise<void> {
  try {
    console.log("[USER-SERVICE] Creating user:", user.email)
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      console.log("[USER-SERVICE] Using Supabase to create user")
      const supabase = getSupabaseServer()

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

      const supabaseUser = {
        id: userId,
        email: user.email,
        name: user.name,
        image: user.image,
        password: user.password || null,
        tier: user.tier,
        tier_config: user.tierConfig || null,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      }

      const { error } = await supabase.from("users").insert(supabaseUser)

      if (error) {
        console.error("[USER-SERVICE] Error creating user in Supabase:", error)
        throw error
      }

      console.log("[USER-SERVICE] User created in Supabase")
      return
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
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      console.log("[USER-SERVICE] Using Supabase to update user")
      const supabase = getSupabaseServer()

      // Convert camelCase to snake_case for Supabase
      const supabaseUpdates: any = {}
      if (updates.name !== undefined) supabaseUpdates.name = updates.name
      if (updates.email !== undefined) supabaseUpdates.email = updates.email
      if (updates.image !== undefined) supabaseUpdates.image = updates.image
      if (updates.password !== undefined) supabaseUpdates.password = updates.password
      if (updates.tier !== undefined) supabaseUpdates.tier = updates.tier
      if (updates.tierConfig !== undefined) supabaseUpdates.tier_config = updates.tierConfig
      if (updates.updatedAt !== undefined) supabaseUpdates.updated_at = updates.updatedAt

      const { error } = await supabase.from("users").update(supabaseUpdates).eq("id", id)

      if (error) {
        console.error("[USER-SERVICE] Error updating user in Supabase:", error)
        throw error
      }

      console.log("[USER-SERVICE] User updated in Supabase")
      return
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

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Verify a password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Check if a user exists with Google auth
export async function isGoogleUser(email: string): Promise<boolean> {
  const user = await getUserByEmail(email)
  return !!user && !user.password
}
