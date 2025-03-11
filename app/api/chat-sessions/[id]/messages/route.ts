import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getChatSession, addMessage, getMessages } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

// Explicitly set to Node.js runtime
export const runtime = "nodejs"

export async function GET(request: Request, context: { params: { id: string } }) {
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

    const chatSessionId = context.params.id
    console.log("Chat session ID:", chatSessionId)

    const chatSession = await getChatSession(chatSessionId, userId)

    if (!chatSession) {
      return NextResponse.json(
        {
          error: "Chat session not found",
          sessionId: chatSessionId,
          userId: userId,
        },
        { status: 404 },
      )
    }

    const messages = await getMessages(chatSessionId)

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request, context: { params: { id: string } }) {
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

    const { role, content } = await request.json()

    const chatSessionId = context.params.id
    console.log("Chat session ID:", chatSessionId)

    const chatSession = await getChatSession(chatSessionId, userId)

    if (!chatSession) {
      return NextResponse.json(
        {
          error: "Chat session not found",
          sessionId: chatSessionId,
          userId: userId,
        },
        { status: 404 },
      )
    }

    const message = await addMessage(chatSessionId, {
      id: uuidv4(),
      role,
      content,
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error("Error adding message:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error,
      },
      { status: 500 },
    )
  }
}

