import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getChatSessions, createChatSession } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

// Explicitly set to Node.js runtime
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("User ID from session:", userId)

    if (!userId) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 400 })
    }

    const chatSessions = await getChatSessions(userId)

    return NextResponse.json(chatSessions)
  } catch (error) {
    console.error("Error fetching chat sessions:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("User ID from session:", userId)

    if (!userId) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 400 })
    }

    const { name } = await request.json()

    const id = uuidv4()
    const newSession = await createChatSession(name || `Chat ${new Date().toISOString()}`, userId, id)

    return NextResponse.json(newSession)
  } catch (error) {
    console.error("Error creating chat session:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error,
      },
      { status: 500 },
    )
  }
}

