import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail } from "@/utils/user-service"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  try {
    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({ exists: false })
    }

    // Check if the user was registered with Google (no password)
    const provider = user.password ? "email" : "google"

    return NextResponse.json({
      exists: true,
      provider,
    })
  } catch (error) {
    console.error("Error checking email:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
