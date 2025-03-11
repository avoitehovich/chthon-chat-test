import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getChatSession, updateChatSession, deleteChatSession } from "@/lib/db"

// Explicitly set to Node.js runtime
export const runtime = "nodejs"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const chatSessionId = params.id
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

    return NextResponse.json(chatSession)
  } catch (error) {
    console.error("Error fetching chat session:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error,
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const chatSessionId = params.id
    console.log("Chat session ID:", chatSessionId)

    const updatedSession = await updateChatSession(chatSessionId, userId, { name })

    if (!updatedSession) {
      return NextResponse.json(
        {
          error: "Chat session not found",
          sessionId: chatSessionId,
          userId: userId,
        },
        { status: 404 },
      )
    }

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error("Error updating chat session:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const chatSessionId = params.id
    console.log("Chat session ID:", chatSessionId)

    const deletedSession = await deleteChatSession(chatSessionId, userId)

    if (!deletedSession) {
      return NextResponse.json(
        {
          error: "Chat session not found",
          sessionId: chatSessionId,
          userId: userId,
        },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting chat session:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error,
      },
      { status: 500 },
    )
  }
}

