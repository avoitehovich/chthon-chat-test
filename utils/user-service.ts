import { createClient } from "@/lib/supabase"
import type { User } from "@/types/user"
import bcrypt from "bcryptjs"

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("users").select("*").eq("email", email).single()

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null
    }
    throw error
  }

  return data as User
}

// Create user
export async function createUser(user: User): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("users").insert([user])

  if (error) {
    throw error
  }
}

// Update user
export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("users").update(updates).eq("id", id)

  if (error) {
    throw error
  }
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("users").select("*")

  if (error) {
    throw error
  }

  return data as User[]
}

// Delete user
export async function deleteUser(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("users").delete().eq("id", id)

  if (error) {
    throw error
  }
}

// Check if a user exists with Google auth
export async function isGoogleUser(email: string): Promise<boolean> {
  const user = await getUserByEmail(email)
  return !!user && !user.password
}
