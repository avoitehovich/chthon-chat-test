import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log the request body
    console.log("Debug Chat API Request:", JSON.stringify(body, null, 2))

    // Test the Eden AI API with a simple non-streaming request
    const response = await fetch("https://api.edenai.run/v2/text/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EDEN_AI_API_KEY}`,
      },
      body: JSON.stringify({
        providers: "openai",
        text: "Hello, how are you?",
        chatbot_global_action: "You are a helpful AI assistant.",
        temperature: 0.7,
        max_tokens: 100,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({
        success: false,
        error: "Eden AI API error",
        details: errorData,
      })
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      request: body,
      response: data,
    })
  } catch (error) {
    console.error("Debug Chat API Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error,
      },
      { status: 500 },
    )
  }
}

