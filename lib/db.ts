import { sql } from "@vercel/postgres"

// Initialize the database with required tables
export async function initDatabase() {
  try {
    // Create users table (for NextAuth)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        email_verified TIMESTAMP WITH TIME ZONE,
        image TEXT
      )
    `

    // Create accounts table (for NextAuth)
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at BIGINT,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        UNIQUE(provider, provider_account_id)
      )
    `

    // Create sessions table (for NextAuth)
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        session_token TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        expires TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `

    // Create verification tokens table (for NextAuth)
    await sql`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires TIMESTAMP WITH TIME ZONE NOT NULL,
        UNIQUE(identifier, token)
      )
    `

    // Check if chat_sessions table exists
    const chatSessionsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_sessions'
      )
    `

    // If chat_sessions table exists, drop it to recreate without foreign key constraint
    if (chatSessionsExists.rows[0].exists) {
      await sql`DROP TABLE IF EXISTS messages`
      await sql`DROP TABLE IF EXISTS chat_sessions`
    }

    // Create chat sessions table without foreign key constraint
    await sql`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create messages table
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        chat_session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE
      )
    `

    console.log("Database initialized successfully")
    return { success: true }
  } catch (error) {
    console.error("Error initializing database:", error)
    return { success: false, error }
  }
}

// Helper function to execute SQL queries with better error handling
export async function query(text: string, params = []) {
  try {
    // Use the sql template literal from @vercel/postgres
    const result = await sql.query(text, params)
    return result
  } catch (error) {
    console.error("Error executing query", { text, error })
    throw error
  }
}

// Chat session operations with improved error handling
export async function getChatSessions(userId: string) {
  try {
    console.log("Getting chat sessions for user:", userId)
    const result = await sql`
      SELECT * FROM chat_sessions 
      WHERE user_id = ${userId} 
      ORDER BY last_updated DESC
    `
    return result.rows
  } catch (error) {
    console.error("Error fetching chat sessions:", error)
    throw error
  }
}

export async function getChatSession(id: string, userId: string) {
  try {
    console.log("Getting chat session:", id, "for user:", userId)
    const result = await sql`
      SELECT * FROM chat_sessions 
      WHERE id = ${id} AND user_id = ${userId}
    `

    if (result.rows.length === 0) {
      console.log("Chat session not found")
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error("Error fetching chat session:", error)
    throw error
  }
}

export async function createChatSession(name: string, userId: string, id: string) {
  try {
    console.log("Creating chat session:", name, "for user:", userId, "with id:", id)
    const result = await sql`
      INSERT INTO chat_sessions (id, name, user_id, last_updated) 
      VALUES (${id}, ${name}, ${userId}, CURRENT_TIMESTAMP) 
      RETURNING *
    `
    return result.rows[0]
  } catch (error) {
    console.error("Error creating chat session:", error)
    throw error
  }
}

export async function updateChatSession(id: string, userId: string, data: { name?: string }) {
  try {
    const result = await sql`
      UPDATE chat_sessions 
      SET 
        name = COALESCE(${data.name}, name),
        last_updated = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId} 
      RETURNING *
    `
    return result.rows[0]
  } catch (error) {
    console.error("Error updating chat session:", error)
    throw error
  }
}

export async function deleteChatSession(id: string, userId: string) {
  try {
    // First delete all messages in the chat session
    await sql`DELETE FROM messages WHERE chat_session_id = ${id}`

    // Then delete the chat session
    const result = await sql`
      DELETE FROM chat_sessions 
      WHERE id = ${id} AND user_id = ${userId} 
      RETURNING *
    `
    return result.rows[0]
  } catch (error) {
    console.error("Error deleting chat session:", error)
    throw error
  }
}

// Message operations
export async function addMessage(chatSessionId: string, message: { id: string; role: string; content: string }) {
  try {
    console.log("Adding message to chat session:", chatSessionId)
    // Add the message
    const result = await sql`
      INSERT INTO messages (id, role, content, chat_session_id) 
      VALUES (${message.id}, ${message.role}, ${message.content}, ${chatSessionId}) 
      RETURNING *
    `

    // Update the last_updated timestamp of the chat session
    await sql`
      UPDATE chat_sessions 
      SET last_updated = CURRENT_TIMESTAMP 
      WHERE id = ${chatSessionId}
    `

    return result.rows[0]
  } catch (error) {
    console.error("Error adding message:", error)
    throw error
  }
}

export async function getMessages(chatSessionId: string) {
  try {
    console.log("Getting messages for chat session:", chatSessionId)
    const result = await sql`
      SELECT * FROM messages 
      WHERE chat_session_id = ${chatSessionId} 
      ORDER BY timestamp ASC
    `
    return result.rows
  } catch (error) {
    console.error("Error fetching messages:", error)
    throw error
  }
}

