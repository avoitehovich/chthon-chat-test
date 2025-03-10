import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getChatSession, updateChatSession, deleteChatSession } from "@/lib/db"

// Explicitly set to Node.js runtime
export const runtime = "nodejs"

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const chatSessionId = context.params.id
    const chatSession = await getChatSession(chatSessionId, userId)

    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
    }

    return NextResponse.json(chatSession)
  } catch (error) {
    console.error("Error fetching chat session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name } = await request.json()

    const userId = session.user.id
    const chatSessionId = context.params.id
    const updatedSession = await updateChatSession(chatSessionId, userId, { name })

    if (!updatedSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
    }

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error("Error updating chat session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const chatSessionId = context.params.id
    const deletedSession = await deleteChatSession(chatSessionId, userId)

    if (!deletedSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting chat session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

