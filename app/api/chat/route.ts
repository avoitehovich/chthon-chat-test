import { NextResponse } from "next/server"
import { truncateConversation } from "@/utils/token-estimation"
import { saveAnalytics } from "@/utils/analytics"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { tierLimits } from "@/types/user"
import { getSupabaseServer } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    console.log("[CHAT] Processing chat request")

    // Get user session
    const session = await getServerSession(authOptions)

    // Default to registered tier for authenticated users
    // If no session, this is an unauthorized request
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 })
    }

    const userTier = session.user?.tier || "registered"
    console.log("[CHAT] User tier:", userTier)

    // Get user data if available
    let userTierLimits = tierLimits[userTier]

    // If user is authenticated and has a custom tier, fetch their specific configuration
    if (session?.user?.id && userTier === "custom") {
      try {
        console.log("[CHAT] Fetching custom tier config for user:", session.user.id)
        // Try to get user from Supabase first
        const supabase = getSupabaseServer()
        const { data: userData, error } = await supabase
          .from("users")
          .select("tier, tier_config")
          .eq("id", session.user.id)
          .single()

        if (!error && userData?.tier_config) {
          console.log("[CHAT] Using custom tier config from Supabase")
          userTierLimits = userData.tier_config
        } else {
          if (error) {
            console.error("[CHAT] Supabase error fetching user tier config:", error)
          }
          // Fall back to file-based storage
          console.log("[CHAT] Falling back to file-based storage for user tier config")
          const { getUserById } = await import("@/utils/user-service")
          const user = await getUserById(session.user.id)
          if (user?.tierConfig) {
            userTierLimits = user.tierConfig
          }
        }
      } catch (error) {
        console.error("[CHAT] Error fetching user tier config:", error)
        // Continue with default tier limits if there's an error
      }
    }

    // Parse request body with error handling
    let messages, provider
    try {
      const text = await req.text()
      console.log("[CHAT] Request body length:", text.length)

      // Log a sample of the request body (first 100 chars) for debugging
      if (text.length > 0) {
        console.log("[CHAT] Request body sample:", text.substring(0, Math.min(100, text.length)) + "...")
      }

      const body = JSON.parse(text)
      messages = body.messages || []
      provider = body.provider || "openai"

      console.log("[CHAT] Parsed request body successfully. Provider:", provider)
      console.log("[CHAT] Message count:", messages.length)
    } catch (parseError) {
      console.error("[CHAT] Error parsing request JSON:", parseError)
      console.error(
        "[CHAT] Parse error details:",
        parseError instanceof Error ? parseError.message : String(parseError),
      )

      return NextResponse.json(
        {
          error: "Invalid JSON in request body. Please check your request format.",
        },
        { status: 400 },
      )
    }

    // Get the last message from the user
    const lastMessage = messages.filter((m) => m.role === "user").pop()

    if (!lastMessage) {
      console.error("[CHAT] No user message found in request")
      return NextResponse.json({ error: "No user message found" }, { status: 400 })
    }

    console.log("[CHAT] Last message content length:", lastMessage.content ? lastMessage.content.length : 0)

    // Check if the message has an image
    const hasImage = lastMessage.imageUrl && lastMessage.imageUrl.length > 0

    if (hasImage) {
      console.log(
        "[CHAT] Image URL detected:",
        lastMessage.imageUrl.substring(0, Math.min(50, lastMessage.imageUrl.length)) + "...",
      )
    }

    // Check if user can upload images
    if (hasImage && !userTierLimits.canUploadImages) {
      console.log("[CHAT] User tier does not support image analysis")
      return NextResponse.json(
        {
          error: "Your account tier does not support image analysis. Please upgrade to use this feature.",
        },
        { status: 403 },
      )
    }

    // Determine provider based on tier
    let effectiveModel

    if (hasImage) {
      // For images, use google or openai (both support vision)
      effectiveModel = "google"
      console.log("[CHAT] Using Google model for image analysis")
    } else if (!userTierLimits.canSelectProvider) {
      // For freemium, use the cheapest provider (openai in this case)
      effectiveModel = userTierLimits.availableProviders[0]
      console.log("[CHAT] User cannot select provider, using:", effectiveModel)
    } else {
      // Check if the selected provider is available for this tier
      if (!userTierLimits.availableProviders.includes(provider)) {
        effectiveModel = userTierLimits.availableProviders[0]
        console.log("[CHAT] Selected provider not available for tier, using:", effectiveModel)
      } else {
        effectiveModel = provider
        console.log("[CHAT] Using selected provider:", effectiveModel)
      }
    }

    // Apply token limit based on tier
    const maxTokens = Math.min(
      userTierLimits.maxTokens,
      {
        "openai/gpt-4o-mini": 4000,
        "google/gemini-1.5-flash": 4000,
        "xai/grok-2-vision-latest": 4000,
      }[effectiveModel] || 4000,
    )

    console.log("[CHAT] Using max tokens:", maxTokens)

    // Truncate the conversation while preserving system messages
    const truncatedMessages = truncateConversation(messages, maxTokens, true)
    console.log("[CHAT] Truncated message count:", truncatedMessages.length)

    try {
      let responseData
      const startTime = Date.now()

      // Create analytics data object
      const analyticsData = {
        provider: effectiveModel,
        type: hasImage ? "image" : "text",
        timestamp: new Date().toISOString(),
        cost: 0,
        tokens: 0,
        processingTime: 0,
        success: false,
        error: null,
        userTier: userTier,
        userId: session?.user?.id || "anonymous",
        providerDetails: {},
        requestSize: JSON.stringify(truncatedMessages).length,
        responseTime: 0,
        responseSize: 0,
      }

      // Format messages for the new unified API
      const formattedMessages = truncatedMessages.map((msg) => {
        if (msg.role === "user" && msg.imageUrl) {
          // Message with image
          return {
            role: "user",
            content: [
              { type: "text", text: msg.content || "What can you tell me about this image?" },
              {
                type: "image_url",
                image_url: {
                  url: msg.imageUrl,
                },
              },
            ],
          }
        } else {
          // Regular text message
          return {
            role: msg.role,
            content: msg.content,
          }
        }
      })

      // Add system message if not present
      if (!formattedMessages.some((msg) => msg.role === "system")) {
        formattedMessages.unshift({
          role: "system",
          content:
            "You are a helpful AI assistant. When listing items, use simple bullet points (•) for list items and avoid using special characters like ### or **. Format categories with a colon at the end. Keep it brief, no more than 500 tokens.",
        })
      }

      // Check if Eden AI API key is available
      if (!process.env.EDEN_AI_API_KEY) {
        console.error("[CHAT] Missing EDEN_AI_API_KEY environment variable")
        throw new Error("Server configuration error: Missing API key")
      }

      console.log("[CHAT] Sending request to Eden AI unified chat API")
      const chatResponse = await fetch("https://api.edenai.run/v2/llm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.EDEN_AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: maxTokens,
          fallback_model: "openai/gpt-4o-mini", // Fallback to OpenAI if the selected model fails
        }),
      })

      console.log("[CHAT] Eden AI unified API response status:", chatResponse.status)

      if (!chatResponse.ok) {
        let errorData
        let errorText

        try {
          // Try to get the response as text first
          errorText = await chatResponse.text()
          console.log("[CHAT] Eden AI error response text:", errorText)

          // Then try to parse it as JSON
          try {
            errorData = JSON.parse(errorText)
            console.log("[CHAT] Eden AI error parsed as JSON:", JSON.stringify(errorData))
          } catch (jsonError) {
            console.error("[CHAT] Could not parse error response as JSON:", jsonError)
            errorData = { error: "Could not parse error response" }
          }
        } catch (textError) {
          console.error("[CHAT] Could not get error response text:", textError)
          errorData = { error: chatResponse.statusText }
        }

        // Save analytics with error
        analyticsData.error = typeof errorData === "object" ? JSON.stringify(errorData) : String(errorData)
        analyticsData.processingTime = Date.now() - startTime
        analyticsData.responseTime = Date.now() - startTime
        await saveAnalytics(analyticsData)

        // Provide a more detailed error message
        let errorMessage = "Error from Eden AI Chat API"
        if (errorData.error) {
          errorMessage += `: ${errorData.error}`
        } else if (errorData.message) {
          errorMessage += `: ${errorData.message}`
        }

        console.error("[CHAT] Chat API error:", errorMessage)
        return NextResponse.json({ error: errorMessage }, { status: chatResponse.status })
      }

      let chatData
      let responseText

      try {
        // First get the raw text
        responseText = await chatResponse.text()
        console.log("[CHAT] Eden AI chat response text length:", responseText.length)

        // Then parse as JSON
        try {
          chatData = JSON.parse(responseText)
          console.log("[CHAT] Eden AI chat response parsed successfully")
        } catch (jsonError) {
          console.error("[CHAT] Error parsing chat API JSON response:", jsonError)
          console.error(
            "[CHAT] Response text sample:",
            responseText.substring(0, Math.min(200, responseText.length)) + "...",
          )

          throw new Error(`JSON parse error: ${jsonError.message}`)
        }
      } catch (responseError) {
        console.error("[CHAT] Error getting chat API response:", responseError)

        // Save analytics with error
        analyticsData.error = `Response error: ${responseError.message}`
        analyticsData.processingTime = Date.now() - startTime
        analyticsData.responseTime = Date.now() - startTime
        await saveAnalytics(analyticsData)

        return NextResponse.json(
          {
            error: "Error processing response from chat API",
          },
          { status: 500 },
        )
      }

      // Save analytics data
      analyticsData.success = true
      analyticsData.processingTime = Date.now() - startTime
      analyticsData.responseTime = Date.now() - startTime
      analyticsData.cost = chatData.cost || 0
      analyticsData.tokens = chatData.tokens_used || 0
      analyticsData.responseSize = responseText.length

      // Store provider-specific details
      analyticsData.providerDetails = {}
      if (chatData.usage) {
        analyticsData.providerDetails[effectiveModel] = {
          cost: chatData.cost || 0,
          tokens: chatData.tokens_used || 0,
          processingTime: chatData.processing_time || 0,
          model: chatData.model || "unknown",
          promptTokens: chatData.usage.prompt_tokens || 0,
          completionTokens: chatData.usage.completion_tokens || 0,
          totalTokens: chatData.usage.total_tokens || 0,
        }

        // Update the main analytics data with the most accurate token counts
        if (chatData.usage.total_tokens) {
          analyticsData.tokens = chatData.usage.total_tokens
        }
      }

      console.log("[CHAT] Chat cost:", analyticsData.cost, "tokens:", analyticsData.tokens)
      console.log("[CHAT] Chat processing time:", chatData.processing_time || "unknown")
      if (chatData.usage) {
        console.log("[CHAT] Token usage:", JSON.stringify(chatData.usage))
      }
      await saveAnalytics(analyticsData)

      // Get the response content
      if (!chatData.generated_text && !chatData.message) {
        console.error("[CHAT] No response content from API")
        return NextResponse.json({
          role: "assistant",
          content: "No response was generated from API. The provider might be temporarily unavailable.",
        })
      }

      // Clean up the response text (use message.content for new API or generated_text for backward compatibility)
      const responseContent = chatData.message?.content || chatData.generated_text || ""
      const cleanedText = responseContent
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

      console.log("[CHAT] Cleaned text length:", cleanedText.length)

      if (!cleanedText || cleanedText.trim() === "") {
        console.log("[CHAT] Empty response from provider")
        responseData = {
          role: "assistant",
          content: "No response was generated from API. Please try again with a different query.",
        }
      } else {
        responseData = {
          role: "assistant",
          content: cleanedText,
        }
      }

      // Return the response
      console.log("[CHAT] Returning successful response")
      return NextResponse.json(responseData)
    } catch (error) {
      console.error("[CHAT] Error in API processing:", error)
      console.error("[CHAT] Error details:", error instanceof Error ? error.stack : String(error))
      return NextResponse.json(
        { error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}` },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[CHAT] Unhandled error in chat API route:", error)
    console.error("[CHAT] Error details:", error instanceof Error ? error.stack : String(error))
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
