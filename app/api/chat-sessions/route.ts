import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getChatSessions, createChatSession } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

// types.d.ts or any file included in tsconfig.json
import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string; // Add the id property
      name?: string | null | undefined;
      email?: string | null | undefined;
      image?: string | null | undefined;
    } & DefaultSession["user"]; // Merge with default session user
  }

  interface User extends DefaultUser {
    id: string; // Add the id property to the User type
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string; // Add the id property to the JWT type
  }
}

// Explicitly set to Node.js runtime
export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const chatSessions = await getChatSessions(userId)

    return NextResponse.json(chatSessions)
  } catch (error) {
    console.error("Error fetching chat sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name } = await req.json()

    const userId = session.user.id
    const id = uuidv4()
    const newSession = await createChatSession(name || `Chat ${new Date().toISOString()}`, userId, id)

    return NextResponse.json(newSession)
  } catch (error) {
    console.error("Error creating chat session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

