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

    // Create a ReadableStream that will be returned to the client
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        // Function to read from the response body stream
        const reader = response.body?.getReader()
        if (!reader) {
          controller.error("No response body")
          return
        }

        let accumulatedData = ""

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              // Send a final [DONE] message to signal completion
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              break
            }

            // Decode the chunk and add it to our accumulated data
            const chunk = decoder.decode(value, { stream: true })
            accumulatedData += chunk

            // Process any complete messages in the accumulated data
            let match
            const regex = /data: (.*?)(\n\n|$)/g

            while ((match = regex.exec(accumulatedData)) !== null) {
              const data = match[1]

              if (data === "[DONE]") {
                // End of stream from Eden AI
                controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              } else {
                try {
                  const parsed = JSON.parse(data)

                  if (parsed.openai && parsed.openai.generated_text) {
                    // Format for AI SDK compatibility
                    const aiSdkFormat = JSON.stringify({
                      choices: [{ delta: { content: parsed.openai.generated_text } }],
                    })
                    controller.enqueue(encoder.encode(`data: ${aiSdkFormat}\n\n`))
                  }
                } catch (e) {
                  console.error("Error parsing JSON:", e)
                }
              }

              // Remove the processed message from accumulated data
              accumulatedData = accumulatedData.substring(match.index + match[0].length)
              regex.lastIndex = 0 // Reset regex index
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

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

