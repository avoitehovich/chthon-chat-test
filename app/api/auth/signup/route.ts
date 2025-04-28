import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, createUser, hashPassword } from "@/utils/user-service"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      // If user exists and has a password, it's already registered with email
      if (existingUser.password) {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 })
      }

      // If user exists but doesn't have a password, it was registered with Google
      return NextResponse.json(
        {
          error: "This email is already registered with Google. Please sign in with Google instead.",
        },
        { status: 400 },
      )
    }

    // Hash the password
    const hashedPassword = await hashPassword(password)

    // Generate a UUID for the new user
    const userId = crypto.randomUUID()

    // Create the user
    await createUser({
      id: userId,
      email,
      name,
      password: hashedPassword,
      tier: "registered",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error during signup:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
