import { createServerClient } from "@/lib/supabase"
import type { User } from "@/types/user"
import bcrypt from "bcryptjs"

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

// Verify a password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

// Get a user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.from("users").select("*").eq("email", email).single()

    if (error) {
      console.error("Error fetching user by email:", error)
      return null
    }

    return data as User
  } catch (error) {
    console.error("Error in getUserByEmail:", error)
    return null
  }
}

// Create a new user
export async function createUser(user: User): Promise<void> {
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from("users").insert([user])

    if (error) {
      console.error("Error creating user:", error)
      throw error
    }
  } catch (error) {
    console.error("Error in createUser:", error)
    throw error
  }
}

// Update a user
export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from("users").update(updates).eq("id", userId)

    if (error) {
      console.error("Error updating user:", error)
      throw error
    }
  } catch (error) {
    console.error("Error in updateUser:", error)
    throw error
  }
}

// Get all users (for admin)
export async function getAllUsers(): Promise<User[]> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.from("users").select("*").order("createdAt", { ascending: false })

    if (error) {
      console.error("Error fetching all users:", error)
      return []
    }

    return data as User[]
  } catch (error) {
    console.error("Error in getAllUsers:", error)
    return []
  }
}

// Delete a user
export async function deleteUser(userId: string): Promise<void> {
  try {
    const supabase = createServerClient()
    const { error } = await supabase.from("users").delete().eq("id", userId)

    if (error) {
      console.error("Error deleting user:", error)
      throw error
    }
  } catch (error) {
    console.error("Error in deleteUser:", error)
    throw error
  }
}
