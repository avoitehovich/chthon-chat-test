import { getServerSession as getNextAuthServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

// Wrapper function to get server session
export async function getServerSession() {
  try {
    const session = await getNextAuthServerSession(authOptions)

    // Log session data for debugging
    console.log(
      "Session data:",
      JSON.stringify({
        user: session?.user
          ? {
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
            }
          : null,
      }),
    )

    return session
  } catch (error) {
    console.error("Error getting server session:", error)
    return null
  }
}

