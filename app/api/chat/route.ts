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
    let effectiveProvider

    if (hasImage) {
      // For images, always use google
      effectiveProvider = "google"
      console.log("[CHAT] Using Google provider for image analysis")
    } else if (!userTierLimits.canSelectProvider) {
      // For freemium, use the cheapest provider (openai in this case)
      effectiveProvider = userTierLimits.availableProviders[0]
      console.log("[CHAT] User cannot select provider, using:", effectiveProvider)
    } else {
      // Check if the selected provider is available for this tier
      if (!userTierLimits.availableProviders.includes(provider)) {
        effectiveProvider = userTierLimits.availableProviders[0]
        console.log("[CHAT] Selected provider not available for tier, using:", effectiveProvider)
      } else {
        effectiveProvider = provider
        console.log("[CHAT] Using selected provider:", effectiveProvider)
      }
    }

    // Apply token limit based on tier
    const maxTokens = Math.min(
      userTierLimits.maxTokens,
      {
        openai: 4000,
        deepseek: 4000,
        amazon: 3000,
        xai: 4000,
        google: 4000,
      }[effectiveProvider] || 4000,
    )

    console.log("[CHAT] Using max tokens:", maxTokens)

    // Truncate the conversation while preserving system messages
    const truncatedMessages = truncateConversation(messages, maxTokens, true)
    console.log("[CHAT] Truncated message count:", truncatedMessages.length)

    // Format the conversation history for Eden AI
    const history = truncatedMessages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      message: m.content,
    }))

    try {
      let responseData
      const startTime = Date.now()

      // Create analytics data object
      const analyticsData = {
        provider: effectiveProvider,
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

      if (hasImage) {
        console.log(`[CHAT] Processing image analysis request using provider: google`)

        // Validate the image URL
        if (!lastMessage.imageUrl.startsWith("http")) {
          console.error(
            "[CHAT] Invalid image URL format:",
            lastMessage.imageUrl.substring(0, Math.min(30, lastMessage.imageUrl.length)) + "...",
          )
          return NextResponse.json(
            { error: "Invalid image URL. Image URL must be a publicly accessible HTTP URL." },
            { status: 400 },
          )
        }

        // Call the image question answering API
        try {
          // Sanitize and validate the image URL
          const imageUrl = lastMessage.imageUrl.trim()
          console.log("[CHAT] Sanitized image URL:", imageUrl.substring(0, Math.min(50, imageUrl.length)) + "...")

          // Check if Eden AI API key is available
          if (!process.env.EDEN_AI_API_KEY) {
            console.error("[CHAT] Missing EDEN_AI_API_KEY environment variable")
            throw new Error("Server configuration error: Missing API key")
          }

          console.log("[CHAT] Sending request to Eden AI image API")
          if (!process.env.EDEN_AI_API_KEY) {
            console.error("[CHAT] Missing EDEN_AI_API_KEY environment variable")
            throw new Error("Server configuration error: Missing API key")
          }

          console.log("[CHAT] Sending request to Eden AI image API")
          const imageResponse = await fetch("https://api.edenai.run/v2/image/question_answer", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.EDEN_AI_API_KEY}`,
            },
            body: JSON.stringify({
              providers: "google",
              file_url: imageUrl,
              question: lastMessage.content || "What can you tell me about this image?",
            }),
          })

          console.log("[CHAT] Eden AI image API response status:", imageResponse.status)

          if (!imageResponse.ok) {
            let errorData
            let errorText

            try {
              // Try to get the response as text first
              errorText = await imageResponse.text()
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
              errorData = { error: imageResponse.statusText }
            }

            // Save analytics with error
            analyticsData.error = typeof errorData === "object" ? JSON.stringify(errorData) : String(errorData)
            analyticsData.processingTime = Date.now() - startTime
            analyticsData.responseTime = Date.now() - startTime
            await saveAnalytics(analyticsData)

            // Provide a more detailed error message
            let errorMessage = "Error from Eden AI Image API"
            if (errorData.error) {
              errorMessage += `: ${errorData.error}`
            } else if (errorData.message) {
              errorMessage += `: ${errorData.message}`
            }

            console.error("[CHAT] Image API error:", errorMessage)
            return NextResponse.json({ error: errorMessage }, { status: imageResponse.status })
          }

          let imageData
          let responseText

          try {
            // First get the raw text
            responseText = await imageResponse.text()
            console.log("[CHAT] Eden AI image response text length:", responseText.length)

            // Then parse as JSON
            try {
              imageData = JSON.parse(responseText)
              console.log("[CHAT] Eden AI image response parsed successfully")
            } catch (jsonError) {
              console.error("[CHAT] Error parsing image API JSON response:", jsonError)
              console.error(
                "[CHAT] Response text sample:",
                responseText.substring(0, Math.min(200, responseText.length)) + "...",
              )

              throw new Error(`JSON parse error: ${jsonError.message}`)
            }
          } catch (responseError) {
            console.error("[CHAT] Error getting image API response:", responseError)

            // Save analytics with error
            analyticsData.error = `Response error: ${responseError.message}`
            analyticsData.processingTime = Date.now() - startTime
            analyticsData.responseTime = Date.now() - startTime
            await saveAnalytics(analyticsData)

            return NextResponse.json(
              {
                error: "Error processing response from image API",
              },
              { status: 500 },
            )
          }

          // Extract the answer from the provider's response
          const providerImageResponse = imageData.google
          console.log(
            "[CHAT] Provider image response status:",
            providerImageResponse ? providerImageResponse.status : "undefined",
          )

          // Save analytics data
          analyticsData.success = true
          analyticsData.processingTime = Date.now() - startTime
          analyticsData.responseTime = Date.now() - startTime
          analyticsData.responseSize = responseText.length

          // Extract cost and tokens if available
          if (providerImageResponse && providerImageResponse.status === "success") {
            analyticsData.cost = imageData.cost || 0
            analyticsData.tokens = imageData.tokens_used || 0

            // Store provider-specific details
            analyticsData.providerDetails = {
              google: {
                cost: imageData.cost || 0,
                tokens: imageData.tokens_used || 0,
                processingTime: providerImageResponse.processing_time || 0,
                model: providerImageResponse.model || "unknown",
              },
            }

            console.log("[CHAT] Image analysis cost:", analyticsData.cost, "tokens:", analyticsData.tokens)
            console.log("[CHAT] Image analysis processing time:", providerImageResponse.processing_time || "unknown")
          }

          await saveAnalytics(analyticsData)

          if (!providerImageResponse || providerImageResponse.status !== "success") {
            const errorDetail = providerImageResponse?.error || "Unknown error"
            console.error(`[CHAT] No valid response from image analysis: ${errorDetail}`)

            // Return a fallback message for empty responses
            responseData = {
              role: "assistant",
              content:
                "No response was generated from API. The image might not be processable or the service might be temporarily unavailable.",
            }
          } else {
            // Get the first answer or join multiple answers if available
            let answer

            if (Array.isArray(providerImageResponse.answers)) {
              console.log("[CHAT] Multiple answers received, count:", providerImageResponse.answers.length)
              answer = providerImageResponse.answers.join("\n\n")
            } else {
              console.log("[CHAT] Single answer received")
              answer = providerImageResponse.answers
            }

            if (!answer || answer.trim() === "") {
              console.log("[CHAT] Empty answer received from provider")
              responseData = {
                role: "assistant",
                content: "No response was generated from API. The image might not contain recognizable content.",
              }
            } else {
              console.log("[CHAT] Answer length:", answer.length)
              responseData = {
                role: "assistant",
                content: answer,
              }
            }
          }
        } catch (error) {
          console.error("[CHAT] Error calling Eden AI image API:", error)
          console.error("[CHAT] Error details:", error instanceof Error ? error.stack : String(error))

          // Save analytics with error
          analyticsData.error = error instanceof Error ? error.message : "Unknown error"
          analyticsData.processingTime = Date.now() - startTime
          analyticsData.responseTime = Date.now() - startTime
          await saveAnalytics(analyticsData)

          return NextResponse.json(
            { error: `Failed to process image: ${error instanceof Error ? error.message : "Unknown error"}` },
            { status: 500 },
          )
        }
      } else {
        // Call the text chat API (no image)
        try {
          // Sanitize the input text to ensure it's properly encoded
          const sanitizedText = lastMessage.content
          console.log("[CHAT] Sanitized text length:", sanitizedText.length)

          // Check if Eden AI API key is available
          if (!process.env.EDEN_AI_API_KEY) {
            console.error("[CHAT] Missing EDEN_AI_API_KEY environment variable")
            throw new Error("Server configuration error: Missing API key")
          }

          console.log("[CHAT] Sending request to Eden AI chat API")
          const chatResponse = await fetch("https://api.edenai.run/v2/text/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.EDEN_AI_API_KEY}`,
            },
            body: JSON.stringify({
              providers: effectiveProvider,
              text: sanitizedText,
              chatbot_global_action:
                "You are a helpful AI assistant. When listing items, use simple bullet points (•) for list items and avoid using special characters like ### or **. Format categories with a colon at the end. Keep it brief, no more than 500 tokens.",
              previous_history: history,
              temperature: 0.7,
              max_tokens: maxTokens, // Apply tier token limit
              fallback_providers: "",
            }),
          })

          console.log("[CHAT] Eden AI chat API response status:", chatResponse.status)

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
          if (chatData[effectiveProvider]) {
            const providerResponse = chatData[effectiveProvider]
            const usage = providerResponse.usage || {}

            analyticsData.providerDetails[effectiveProvider] = {
              cost: chatData.cost || 0,
              tokens: chatData.tokens_used || 0,
              processingTime: providerResponse.processing_time || 0,
              model: providerResponse.model || "unknown",
              promptTokens: usage.prompt_tokens || 0,
              completionTokens: usage.completion_tokens || 0,
              totalTokens: usage.total_tokens || 0,
              // Add detailed token breakdowns if available
              completionTokensDetails: usage.completion_tokens_details || null,
              promptTokensDetails: usage.prompt_tokens_details || null,
            }

            // Update the main analytics data with the most accurate token counts
            if (usage.total_tokens) {
              analyticsData.tokens = usage.total_tokens
            }
          }

          console.log("[CHAT] Chat cost:", analyticsData.cost, "tokens:", analyticsData.tokens)
          console.log("[CHAT] Chat processing time:", chatData[effectiveProvider]?.processing_time || "unknown")
          if (chatData[effectiveProvider]?.usage) {
            console.log("[CHAT] Token usage:", JSON.stringify(chatData[effectiveProvider].usage))
          }
          await saveAnalytics(analyticsData)

          // Get the response from the selected provider
          const providerChatResponse = chatData[effectiveProvider]

          if (!providerChatResponse) {
            console.error("[CHAT] No response from provider:", effectiveProvider)
            return NextResponse.json({
              role: "assistant",
              content: "No response was generated from API. The provider might be temporarily unavailable.",
            })
          }

          // Clean up the response text
          const cleanedText = providerChatResponse.generated_text
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
        } catch (error) {
          console.error("[CHAT] Error calling Eden AI chat API:", error)
          console.error("[CHAT] Error details:", error instanceof Error ? error.stack : String(error))

          // Save analytics with error
          analyticsData.error = error instanceof Error ? error.message : "Unknown error"
          analyticsData.processingTime = Date.now() - startTime
          analyticsData.responseTime = Date.now() - startTime
          await saveAnalytics(analyticsData)

          return NextResponse.json(
            { error: `Failed to process chat: ${error instanceof Error ? error.message : "Unknown error"}` },
            { status: 500 },
          )
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
