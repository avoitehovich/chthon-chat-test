import { getSupabaseServer, isSupabaseAvailable } from "@/lib/supabase"
import type { Message } from "@/types/chat"

// Get all chat sessions for a user
export async function getUserChatSessions(userId: string) {
  try {
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      const supabase = getSupabaseServer()
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("last_updated", { ascending: false })

      if (error) {
        console.error("Error fetching chat sessions from Supabase:", error)
        throw error
      }

      return data.map((session) => ({
        id: session.id,
        name: session.name,
        messages: [],
        lastUpdated: new Date(session.last_updated).getTime(),
        userId: session.user_id,
      }))
    }

    // If Supabase is not available, return empty array
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
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      const supabase = getSupabaseServer()
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: true })

      if (error) {
        console.error("Error fetching messages from Supabase:", error)
        throw error
      }

      return data.map((message) => ({
        id: message.id,
        role: message.role as "user" | "assistant",
        content: message.content,
        timestamp: new Date(message.timestamp).getTime(),
        imageUrl: message.image_url || undefined,
      }))
    }

    // If Supabase is not available, return empty array
    return []
  } catch (error) {
    console.error(`Error getting messages for session ${sessionId}:`, error)
    return []
  }
}

// Create a new chat session
export async function createChatSession(userId: string, name: string) {
  try {
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      const supabase = getSupabaseServer()
      const sessionId = Date.now().toString()

      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          id: sessionId,
          user_id: userId,
          name,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating chat session in Supabase:", error)
        throw error
      }

      return {
        id: data.id,
        name: data.name,
        messages: [],
        lastUpdated: new Date(data.last_updated).getTime(),
        userId: data.user_id,
      }
    }

    // If Supabase is not available, throw error
    throw new Error("Database not available")
  } catch (error) {
    console.error(`Error creating chat session for user ${userId}:`, error)
    throw error
  }
}

// Add a message to a chat session
export async function addMessageToChatSession(sessionId: string, message: Message): Promise<Message> {
  try {
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      const supabase = getSupabaseServer()

      // Add message with snake_case column names
      const { error: messageError } = await supabase.from("messages").insert({
        id: message.id,
        session_id: sessionId,
        role: message.role,
        content: message.content,
        image_url: message.imageUrl,
        timestamp: new Date(message.timestamp).toISOString(),
      })

      if (messageError) {
        console.error("Error adding message to Supabase:", messageError)
        throw messageError
      }

      // Update session last_updated
      const { error: sessionError } = await supabase
        .from("chat_sessions")
        .update({ last_updated: new Date().toISOString() })
        .eq("id", sessionId)

      if (sessionError) {
        console.error("Error updating chat session in Supabase:", sessionError)
        throw sessionError
      }

      return message
    }

    // If Supabase is not available, throw error
    throw new Error("Database not available")
  } catch (error) {
    console.error(`Error adding message to session ${sessionId}:`, error)
    throw error
  }
}

// Delete a chat session
export async function deleteChatSession(sessionId: string) {
  try {
    // Try to use Supabase first
    const supabaseAvailable = await isSupabaseAvailable()

    if (supabaseAvailable) {
      const supabase = getSupabaseServer()

      // Delete session (messages will be deleted via cascade)
      const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId)

      if (error) {
        console.error("Error deleting chat session from Supabase:", error)
        throw error
      }

      return true
    }

    // If Supabase is not available, throw error
    throw new Error("Database not available")
  } catch (error) {
    console.error(`Error deleting chat session ${sessionId}:`, error)
    return false
  }
}
