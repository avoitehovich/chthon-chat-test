import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { getUserByEmail, createUser, updateUser } from "@/utils/user-service"
import crypto from "crypto"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        console.error("No email provided by Google")
        return false
      }

      try {
        // Check if user exists
        const existingUser = await getUserByEmail(user.email)

        if (!existingUser) {
          try {
            // Generate a UUID for the new user
            const userId = crypto.randomUUID()

            // Create new user with registered tier
            await createUser({
              id: userId,
              email: user.email,
              name: user.name || "User",
              image: user.image,
              tier: "registered", // New users start as registered
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          } catch (createError) {
            console.error("Error creating user:", createError)
            // Allow sign in even if we can't create the user record
            return true
          }
        } else {
          try {
            // Update user's last login
            await updateUser(existingUser.id, {
              updatedAt: new Date().toISOString(),
            })
          } catch (updateError) {
            console.error("Error updating user:", updateError)
            // Allow sign in even if we can't update the user record
          }
        }

        return true
      } catch (error) {
        console.error("Error during sign in:", error)
        // Allow sign in even if there's an error with our user management
        return true
      }
    },
    async session({ session, user, token }) {
      // Add user tier to session
      if (session.user?.email) {
        const dbUser = await getUserByEmail(session.user.email)
        if (dbUser) {
          session.user.tier = dbUser.tier
          session.user.id = dbUser.id
        } else {
          session.user.tier = "registered"
        }
      }

      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
