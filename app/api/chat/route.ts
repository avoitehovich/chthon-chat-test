import { type NextRequest, NextResponse } from "next/server"
import type { Message } from "ai"

// Use the Edge runtime for this route only
export const runtime = "edge"

// Helper function to truncate conversation history if it gets too long
function truncateConversationHistory(messages: Message[], maxTokens = 4000) {
  // This is a simple approximation - in production you'd use a tokenizer
  const estimatedTokens = messages.reduce((acc, message) => {
    return acc + message.content.length / 4 // Rough estimate: 4 chars ~= 1 token
  }, 0)

  if (estimatedTokens <= maxTokens) {
    return messages
  }

  // Keep system messages and the most recent messages
  const systemMessages = messages.filter((m) => m.role === "system")
  const nonSystemMessages = messages.filter((m) => m.role !== "system")

  // Sort by most recent and keep as many as possible within token limit
  nonSystemMessages.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bTime - aTime
  })

  const truncatedMessages = [...systemMessages]
  let currentTokens = systemMessages.reduce((acc, message) => {
    return acc + message.content.length / 4
  }, 0)

  for (const message of nonSystemMessages) {
    const messageTokens = message.content.length / 4
    if (currentTokens + messageTokens <= maxTokens) {
      truncatedMessages.push(message)
      currentTokens += messageTokens
    } else {
      break
    }
  }

  // Sort back to chronological order
  truncatedMessages.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return aTime - bTime
  })

  return truncatedMessages
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    // Apply memory management to prevent context windows from getting too large
    const truncatedMessages = truncateConversationHistory(messages)

    // Get the last message from the user
    const lastMessage = truncatedMessages.filter((m) => m.role === "user").pop()

    if (!lastMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 })
    }

    // Format the conversation history for Eden AI
    const history = truncatedMessages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      message: m.content,
    }))

    // Create a streaming response
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
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Eden AI error:", errorData)
      return NextResponse.json({ error: "Error from Eden AI API" }, { status: response.status })
    }
/*
    // Create a ReadableStream that will be returned to the client
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    let streamContent = ""

    const stream = new ReadableStream({
      async start(controller) {
        // Function to read from the response body stream
        const reader = response.body?.getReader()
        if (!reader) {
          controller.error("No response body")
          return
        }

        try {
          // Send an initial message to start the stream
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "" } }] })}\n\n`))

          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              // If we've collected content, send it as a final message
              if (streamContent.length > 0) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: streamContent } }] })}\n\n`),
                )
                streamContent = ""
              }

              // Send a final [DONE] message to signal completion
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              break
            }

            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true })

            // Process the chunk
            const lines = chunk.split("\n")
            for (const line of lines) {
              if (line.startsWith("data:")) {
                try {
                  const jsonStr = line.replace(/^data: /, "").trim()
                  if (jsonStr === "[DONE]") {
                    continue // Skip Eden AI's DONE message, we'll send our own
                  }

                  const data = JSON.parse(jsonStr)

                  if (data.openai && data.openai.generated_text) {
                    // Collect the content
                    const text = data.openai.generated_text
                    streamContent += text

                    // Send the chunk to the client
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`),
                    )
                  }
                } catch (e) {
                  console.error("Error parsing JSON:", e, line)
                }
              }
            }
          }

          // Close the stream
          controller.close()
        } catch (e) {
          console.error("Error processing stream:", e)
          controller.error(e)
        }
      },
    })
      */
 //   JSON.stringify({ choices: [{ delta: { content: text } }] })
 //   role: "assistant",
 //   content: data.openai.generated_text
 const data = await response.json();
    return NextResponse.json({
      role: "assistant",
      content: data.openai.generated_text,
    })

/*
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
    */
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

