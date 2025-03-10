import { NextResponse } from "next/server"

export const runtime = "edge"

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Get the last message from the user
  const lastMessage = messages.filter((m: { role: string }) => m.role === "user").pop();

  if (!lastMessage) {
    return NextResponse.json({ error: "No user message found" }, { status: 400 })
  }

  // Format the conversation history for Eden AI
  const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
    role: m.role === "user" ? "user" : "assistant",
    message: m.content,
  }))

  try {
    const response = await fetch("https://api.edenai.run/v2/text/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EDEN_AI_API_KEY}`,
      },
      body: JSON.stringify({
        providers: "openai",
        text: lastMessage.content,
        chatbot_global_action:
          "You are a helpful AI assistant. When listing items, use simple bullet points (•) for list items and avoid using special characters like ### or **. Format categories with a colon at the end.",
        previous_history: history,
        temperature: 0.7,
        max_tokens: 500,
        fallback_providers: "",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Eden AI error:", errorData)
      return NextResponse.json({ error: "Error from Eden AI API" }, { status: response.status })
    }

    const data = await response.json()

    // Clean up the response text
    const cleanedText = data.openai.generated_text
      // Remove ### markers
      .replace(/###\s*/g, "")
      // Remove ** markers
      .replace(/\*\*/g, "")
      // Ensure consistent bullet points
      .replace(/^[-*]\s*/gm, "• ")
      // Add newlines before categories
      .replace(/([A-Za-z]+\s+Activities:)/g, "\n$1")
      // Remove extra newlines
      .replace(/\n{3,}/g, "\n\n")
      .trim()

    // Return the cleaned message
    return NextResponse.json({
      role: "assistant",
      content: cleanedText,
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
