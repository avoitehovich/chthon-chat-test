import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getChatSession, addMessage, getMessages } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// Explicitly set to Node.js runtime
export const runtime = "nodejs";

// Define the params type
type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(
  request: Request,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getServerSession();
    const { id } = context.params;

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = id
    const chatSessionId = context.params.id
    const chatSession = await getChatSession(chatSessionId, userId)

    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
    }

    const messages = await getMessages(chatSessionId)

    return NextResponse.json(messages)

    // Simplified response for testing
    //return NextResponse.json({ message: `Fetching messages for chat session ${id}` });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, content } = await request.json();

    const userId = context.params.id;
    const chatSessionId = context.params.id;
    const chatSession = await getChatSession(chatSessionId, userId);

    if (!chatSession) {
      const messages = [
        { id: 1, text: `Message 1 from session ${userId}` },
        { id: 2, text: `Message 2 from session ${userId}` },
      ];
      return NextResponse.json({ messages });
    }

    const message = await addMessage(chatSessionId, {
      id: uuidv4(),
      role,
      content,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error adding message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}