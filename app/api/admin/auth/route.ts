import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { adminKey } = await req.json()

    // Check if the admin key matches the environment variable
    if (adminKey === process.env.ADMIN_KEY) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Invalid admin key" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error in admin authentication:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
