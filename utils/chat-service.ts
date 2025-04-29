import { prisma } from "@/lib/db"
import { isDatabaseAvailable } from "@/lib/db"
import type { Message } from "@/types/chat"

// Get all chat sessions for a user
export async function getUserChatSessions(userId: string) {
  try {
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      const sessions = await prisma.chatSession.findMany({
        where: { userId },
        orderBy: { lastUpdated: "desc" },
      })

      return sessions.map((session) => ({
        id: session.id,
        name: session.name,
        messages: [],
        lastUpdated: session.lastUpdated.getTime(),
        userId: session.userId,
      }))
    }

    // If database is not available, return empty array
    // We don't have a file-based fallback for chat sessions
    return []
  } catch (error) {
    console.error(`Error getting chat sessions for user ${userId}:`, error)
    return []
  }
}

// Get messages for a chat session
export async function getChatSessionMessages(sessionId: string) {
  try {
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      const messages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { timestamp: "asc" },
      })

      return messages.map((message) => ({
        id: message.id,
        role: message.role as "user" | "assistant",
        content: message.content,
        timestamp: message.timestamp.getTime(),
        imageUrl: message.imageUrl || undefined,
      }))
    }

    // If database is not available, return empty array
    return []
  } catch (error) {
    console.error(`Error getting messages for session ${sessionId}:`, error)
    return []
  }
}

// Create a new chat session
export async function createChatSession(userId: string, name: string) {
  try {
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      const sessionId = Date.now().toString()

      const session = await prisma.chatSession.create({
        data: {
          id: sessionId,
          userId,
          name,
          lastUpdated: new Date(),
          createdAt: new Date(),
        },
      })

      return {
        id: session.id,
        name: session.name,
        messages: [],
        lastUpdated: session.lastUpdated.getTime(),
        userId: session.userId,
      }
    }

    // If database is not available, throw error
    throw new Error("Database not available")
  } catch (error) {
    console.error(`Error creating chat session for user ${userId}:`, error)
    throw error
  }
}

// Add a message to a chat session
export async function addMessageToChatSession(sessionId: string, message: Message): Promise<Message> {
  try {
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      // Add message
      await prisma.message.create({
        data: {
          id: message.id,
          sessionId,
          role: message.role,
          content: message.content,
          imageUrl: message.imageUrl,
          timestamp: new Date(message.timestamp),
        },
      })

      // Update session last_updated
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { lastUpdated: new Date() },
      })

      return message
    }

    // If database is not available, throw error
    throw new Error("Database not available")
  } catch (error) {
    console.error(`Error adding message to session ${sessionId}:`, error)
    throw error
  }
}

// Delete a chat session
export async function deleteChatSession(sessionId: string) {
  try {
    // Try to use Prisma first
    const dbAvailable = await isDatabaseAvailable()

    if (dbAvailable) {
      // Delete session (messages will be deleted via cascade)
      await prisma.chatSession.delete({
        where: { id: sessionId },
      })

      return true
    }

    // If database is not available, throw error
    throw new Error("Database not available")
  } catch (error) {
    console.error(`Error deleting chat session ${sessionId}:`, error)
    return false
  }
}
