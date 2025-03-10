import { getServerSession as getNextAuthServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

// Wrapper function to get server session
export async function getServerSession() {
  try {
    return await getNextAuthServerSession(authOptions)
  } catch (error) {
    console.error("Error getting server session:", error)
    return null
  }
}

