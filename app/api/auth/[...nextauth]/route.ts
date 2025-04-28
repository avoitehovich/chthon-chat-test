import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { getUserByEmail, createUser, updateUser, verifyPassword, hashPassword } from "@/utils/user-service"
import crypto from "crypto"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        isSignUp: { label: "Is Sign Up", type: "boolean" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Check if this is a sign-up request
          if (credentials.isSignUp === "true" && credentials.name) {
            // Check if user already exists
            const existingUser = await getUserByEmail(credentials.email)

            if (existingUser) {
              // If user exists and has a password, it's already registered with email
              if (existingUser.password) {
                throw new Error("Email already registered")
              }

              // If user exists but doesn't have a password, it was registered with Google
              throw new Error("google_account")
            }

            // Hash the password
            const hashedPassword = await hashPassword(credentials.password)

            // Generate a UUID for the new user
            const userId = crypto.randomUUID()

            // Create the user
            await createUser({
              id: userId,
              email: credentials.email,
              name: credentials.name,
              password: hashedPassword,
              tier: "registered",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })

            // Return the user for sign-in
            return {
              id: userId,
              email: credentials.email,
              name: credentials.name,
              tier: "registered",
            }
          } else {
            // This is a sign-in request
            // Check if user exists
            const user = await getUserByEmail(credentials.email)

            // If user doesn't exist or doesn't have a password (Google auth only)
            if (!user || !user.password) {
              return null
            }

            // Verify password
            const isValid = await verifyPassword(credentials.password, user.password)

            if (!isValid) {
              return null
            }

            // Update last login
            await updateUser(user.id, {
              updatedAt: new Date().toISOString(),
            })

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              tier: user.tier,
            }
          }
        } catch (error) {
          console.error("Error during email auth:", error)
          if (error.message === "google_account") {
            throw new Error("google_account")
          }
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        console.error("No email provided")
        return false
      }

      // If this is a credentials sign-in and we've already handled everything in the authorize function
      if (account?.provider === "credentials") {
        return true
      }

      try {
        // For Google sign-in
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
    error: "/auth/error",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
