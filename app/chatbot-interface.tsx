"use client"

import { useState, useEffect, useRef, useMemo, type ChangeEvent, type KeyboardEvent } from "react"
import type React from "react"
import {
  PlusIcon,
  SendIcon,
  TrashIcon,
  MenuIcon,
  XCircleIcon,
  PaperclipIcon,
  AlertCircleIcon,
  LogIn,
  Crown,
  UserCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { SearchChat } from "@/components/search-chat"
import { ThemeToggle } from "@/components/theme-toggle"
import { ProviderSelector } from "@/components/provider-selector"
import { estimateConversationTokens } from "@/utils/token-estimation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSession, signIn, signOut } from "next-auth/react"
import { tierLimits, type UserTier } from "@/types/user"
import { useRouter } from "next/navigation"
import { isSupabaseAvailable } from "@/lib/supabase"
import {
  getUserChatSessions,
  getChatSessionMessages,
  createChatSession,
  addMessageToChatSession,
  deleteChatSession,
} from "@/utils/chat-service"
import type { Message, ChatSession } from "@/types/chat"

// Add this import at the top of the file
import { compressImage, MAX_FILE_SIZE } from "@/utils/image-compressor"

// Add this helper function at the top level
function formatMessageContent(content: string) {
  // Split the content into sections
  const sections = content.split("\n\n")

  return sections.map((section, index) => {
    const lines = section.split("\n")

    return (
      <div key={index} className={index > 0 ? "mt-6" : ""}>
        {lines.map((line, lineIndex) => {
          // Check if line is a category (ends with colon)
          if (line.match(/Activities:$/)) {
            return (
              <h3 key={lineIndex} className="font-semibold text-lg mb-3 mt-4">
                {line}
              </h3>
            )
          }
          // Check if line is a bullet point
          if (line.startsWith("• ")) {
            return (
              <div key={lineIndex} className="ml-4 flex items-start mb-2">
                <span className="mr-2 text-gray-500">•</span>
                <span>{line.substring(2)}</span>
              </div>
            )
          }
          // Regular text
          return (
            <p key={lineIndex} className="mb-2">
              {line}
            </p>
          )
        })}
      </div>
    )
  })
}

// Add selectedProvider to the interface state
export default function ChatbotInterface() {
  // Get user session
  const { data: session, status } = useSession()
  const userTier = (session?.user?.tier as UserTier) || "registered"
  const [userTierLimits, setUserTierLimits] = useState(tierLimits[userTier])
  const [isDbAvailable, setIsDbAvailable] = useState(false)

  // Then add this effect to fetch custom tier config if needed
  useEffect(() => {
    const fetchUserTierConfig = async () => {
      if (status === "authenticated" && session?.user?.id && userTier === "custom") {
        try {
          // Try to get user from Supabase first
          const response = await fetch(`/api/user/config?userId=${session.user.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.tierConfig) {
              setUserTierLimits(data.tierConfig)
            }
          }
        } catch (error) {
          console.error("Error fetching user tier config:", error)
        }
      } else {
        setUserTierLimits(tierLimits[userTier])
      }
    }

    fetchUserTierConfig()
  }, [userTier, status, session?.user?.id])

  // Check if Supabase is available
  useEffect(() => {
    const checkDbAvailability = async () => {
      const available = await isSupabaseAvailable()
      setIsDbAvailable(available)
    }

    checkDbAvailability()
  }, [])

  const tierLimit = userTierLimits
  const router = useRouter()

  // State for the current input and loading state
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState("openai")
  const [tokenCount, setTokenCount] = useState(0)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State for chat sessions
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Refs for scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Add search state
  const [searchQuery, setSearchQuery] = useState("")

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions

    return sessions
      .map((session) => ({
        ...session,
        messages: session.messages.filter((message) =>
          message.content.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      }))
      .filter((session) => session.messages.length > 0)
  }, [sessions, searchQuery])

  // Get current session
  const currentSession = sessions.find((s) => s.id === currentSessionId) || null
  const messages = currentSession?.messages || []

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${Math.min(scrollHeight, 300)}px`
    }
  }, [input])

  // Clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  // Check if the device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Initial check
    checkIfMobile()

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile)

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  // Load sessions from database or localStorage on initial render
  useEffect(() => {
    const loadSessions = async () => {
      if (status === "authenticated" && session?.user?.id && isDbAvailable) {
        try {
          // Load sessions from database
          const dbSessions = await getUserChatSessions(session.user.id)

          if (dbSessions.length > 0) {
            setSessions(dbSessions)

            // Set current session to the most recently updated one
            const mostRecent = dbSessions.sort((a, b) => b.lastUpdated - a.lastUpdated)[0]
            setCurrentSessionId(mostRecent.id)

            // Load messages for the current session
            const messages = await getChatSessionMessages(mostRecent.id)

            // Update the session with messages
            setSessions((prev) =>
              prev.map((session) => (session.id === mostRecent.id ? { ...session, messages } : session)),
            )

            return
          }
        } catch (error) {
          console.error("Error loading sessions from database:", error)
        }
      }

      // Fall back to localStorage if database is not available or user is not authenticated
      const savedSessions = localStorage.getItem("chatSessions")
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions) as ChatSession[]
        setSessions(parsedSessions)

        // Set current session to the most recently updated one
        if (parsedSessions.length > 0) {
          const mostRecent = parsedSessions.sort((a, b) => b.lastUpdated - a.lastUpdated)[0]
          setCurrentSessionId(mostRecent.id)
        }
      } else {
        // Create a default session if none exists
        createNewSession()
      }
    }

    loadSessions()
  }, [status, session?.user?.id, isDbAvailable])

  // Load messages for the current session when it changes
  useEffect(() => {
    const loadMessages = async () => {
      if (currentSessionId && status === "authenticated" && isDbAvailable) {
        try {
          const messages = await getChatSessionMessages(currentSessionId)

          // Update the session with messages
          setSessions((prev) =>
            prev.map((session) => (session.id === currentSessionId ? { ...session, messages } : session)),
          )
        } catch (error) {
          console.error("Error loading messages for session:", error)
        }
      }
    }

    loadMessages()
  }, [currentSessionId, status, isDbAvailable])

  // Scroll to bottom when messages change or when switching sessions
  useEffect(() => {
    scrollToBottom()
  }, [messages, currentSessionId])

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0 && (!isDbAvailable || status !== "authenticated")) {
      localStorage.setItem("chatSessions", JSON.stringify(sessions))
    }
  }, [sessions, isDbAvailable, status])

  // Update token count when messages change
  useEffect(() => {
    if (currentSession?.messages) {
      const count = estimateConversationTokens(
        currentSession.messages.map((m) => ({ role: m.role, content: m.content })),
      )
      setTokenCount(count)
    } else {
      setTokenCount(0)
    }
  }, [currentSession?.messages])

  // Handle provider selection
  const handleProviderChange = (provider: string) => {
    // Check if the provider is available for the user's tier
    if (!tierLimit.availableProviders.includes(provider)) {
      setErrorMessage(`The ${provider} provider is not available on your current tier. Please upgrade to access it.`)
      setShowUpgradeModal(true)
      return
    }

    setSelectedProvider(provider)
  }

  // Create a new chat session
  const createNewSession = async () => {
    const sessionId = Date.now().toString()
    const newSession: ChatSession = {
      id: sessionId,
      name: `Chat ${sessions.length + 1}`,
      messages: [],
      lastUpdated: Date.now(),
      userId: session?.user?.id || "anonymous",
    }

    // Try to create session in database if user is authenticated
    if (status === "authenticated" && session?.user?.id && isDbAvailable) {
      try {
        await createChatSession(session.user.id, newSession.name)
      } catch (error) {
        console.error("Error creating chat session in database:", error)
      }
    }

    setSessions((prev) => [...prev, newSession])
    setCurrentSessionId(newSession.id)

    // Close mobile menu after creating a new session
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }
  }

  // Delete a chat session
  const deleteSession = async (sessionId: string) => {
    // Try to delete session from database if user is authenticated
    if (status === "authenticated" && isDbAvailable) {
      try {
        await deleteChatSession(sessionId)
      } catch (error) {
        console.error("Error deleting chat session from database:", error)
      }
    }

    setSessions((prev) => prev.filter((s) => s.id !== sessionId))

    // If we deleted the current session, switch to another one
    if (sessionId === currentSessionId) {
      const remainingSessions = sessions.filter((s) => s.id !== sessionId)
      if (remainingSessions.length > 0) {
        setCurrentSessionId(remainingSessions[0].id)
      } else {
        createNewSession()
      }
    }
  }

  // Switch to a different session
  const switchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)

    // Close mobile menu after switching sessions
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }

    // We'll scroll to bottom in the useEffect that watches currentSessionId
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  // Handle key press in textarea
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() || selectedImage) {
        handleSubmit(e)
      }
    }
  }

  // Clear input and image
  const clearInput = () => {
    setInput("")
    setSelectedImage(null)
    setImagePreview(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  // Handle file selection
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    // Check if user can upload images
    if (!tierLimit.canUploadImages) {
      setErrorMessage("Your current tier does not support image uploads. Please upgrade to use this feature.")
      setShowUpgradeModal(true)
      return
    }

    const file = e.target.files?.[0]
    if (!file) {
      console.log("No file selected")
      return
    }

    console.log("File selected:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`,
    })

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      console.error("Invalid file type:", file.type)
      setErrorMessage(`Invalid file type: ${file.type}. Please select a valid image file (JPEG, PNG, GIF, WEBP)`)
      return
    }

    try {
      // Show loading state
      setIsUploading(true)

      // Compress image if needed
      let processedFile = file
      if (file.size > MAX_FILE_SIZE) {
        try {
          setErrorMessage("Compressing image to meet size requirements...")
          processedFile = await compressImage(file)
          console.log(
            `Image compressed from ${(file.size / 1024).toFixed(2)}KB to ${(processedFile.size / 1024).toFixed(2)}KB`,
          )

          // If still too large after compression
          if (processedFile.size > MAX_FILE_SIZE) {
            setErrorMessage(
              `Image is still too large (${(processedFile.size / (1024 * 1024)).toFixed(2)}MB) after compression. Please use a smaller image.`,
            )
            setIsUploading(false)
            return
          }

          // Clear compression message if successful
          setErrorMessage(null)
        } catch (compressionError) {
          console.error("Error compressing image:", compressionError)
          setErrorMessage("Failed to compress image. Please try a smaller image.")
          setIsUploading(false)
          return
        }
      }

      setSelectedImage(processedFile)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        try {
          const result = reader.result as string
          console.log("Preview generated, length:", result.length)
          setImagePreview(result)
          setIsUploading(false)
        } catch (error) {
          console.error("Error creating image preview:", error)
          setErrorMessage("Failed to create image preview. Please try another image.")
          setSelectedImage(null)
          setIsUploading(false)
        }
      }
      reader.onerror = (error) => {
        console.error("FileReader error:", error)
        setErrorMessage("Failed to read the image file. Please try another image.")
        setSelectedImage(null)
        setIsUploading(false)
      }

      try {
        reader.readAsDataURL(processedFile)
      } catch (error) {
        console.error("Error reading file as data URL:", error)
        setErrorMessage("Failed to process the image file. Please try another image.")
        setSelectedImage(null)
        setIsUploading(false)
      }
    } catch (error) {
      console.error("Error processing image:", error)
      setErrorMessage("An error occurred while processing the image. Please try again.")
      setIsUploading(false)
    }
  }

  // Trigger file input click
  const triggerFileInput = () => {
    // Check if user can upload images
    if (!tierLimit.canUploadImages) {
      setErrorMessage("Your current tier does not support image uploads. Please upgrade to use this feature.")
      setShowUpgradeModal(true)
      return
    }

    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !selectedImage) || !currentSessionId || isLoading) return

    try {
      // Check token count against tier limit
      if (input.length > tierLimit.maxTokens * 4) {
        // Rough estimate: 4 chars per token
        setErrorMessage(
          `Your message exceeds the ${tierLimit.maxTokens} token limit for your tier. Please shorten your message or upgrade.`,
        )
        setShowUpgradeModal(true)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      let imageUrl = null
      let userContent = input.trim()

      // Process image if selected
      if (selectedImage) {
        try {
          setIsUploading(true)
          console.log("Starting image upload process")

          // Create form data for image upload
          const formData = new FormData()
          formData.append("file", selectedImage)
          formData.append("purpose", "image-analysis")

          // Upload image to server
          console.log("Sending image to upload API")
          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          })

          console.log("Upload response status:", uploadResponse.status)

          if (!uploadResponse.ok) {
            let errorData
            try {
              errorData = await uploadResponse.json()
              console.error("Upload error response:", errorData)

              // Special handling for 413 errors
              if (uploadResponse.status === 413 || errorData.code === "FILE_TOO_LARGE") {
                throw new Error("Image is too large. Please use an image smaller than 2MB or compress the current one.")
              }
            } catch (jsonError) {
              console.error("Failed to parse upload error response:", jsonError)
              errorData = { error: `Server error: ${uploadResponse.status} ${uploadResponse.statusText}` }
            }

            throw new Error(errorData.error || "Failed to upload image")
          }

          let uploadData
          try {
            uploadData = await uploadResponse.json()
            console.log("Upload successful, received URL")
          } catch (jsonError) {
            console.error("Failed to parse upload response:", jsonError)
            throw new Error("Failed to process upload response")
          }

          imageUrl = uploadData.url
          console.log("Image URL received, length:", imageUrl.length)

          // If no text input but image is present, add a default question
          if (!userContent) {
            console.log("No text input with image, using default question")
            userContent = "What can you tell me about this image?"
          }
        } catch (error) {
          console.error("Error uploading image:", error)
          setIsLoading(false)
          setIsUploading(false)
          setErrorMessage(error instanceof Error ? error.message : "Failed to upload image. Please try again.")
          return
        } finally {
          setIsUploading(false)
        }
      }

      // Create user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userContent,
        timestamp: Date.now(),
        imageUrl: imageUrl || undefined,
      }

      console.log("Created user message:", {
        content: userContent.substring(0, 50) + (userContent.length > 50 ? "..." : ""),
        hasImage: !!imageUrl,
      })

      // Update session with user message
      const updatedSessions = sessions.map((session) => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: [...session.messages, userMessage],
            lastUpdated: Date.now(),
          }
        }
        return session
      })

      setSessions(updatedSessions)
      clearInput()

      // Save message to database if user is authenticated
      if (status === "authenticated" && isDbAvailable) {
        try {
          console.log("Saving message to database")
          await addMessageToChatSession(currentSessionId, userMessage)
        } catch (error) {
          console.error("Error saving message to database:", error)
        }
      }

      // Scroll to bottom after sending message
      scrollToBottom()

      try {
        // Get the updated messages for the current session
        const currentMessages = updatedSessions.find((s) => s.id === currentSessionId)?.messages || []

        console.log("Sending message to API:", {
          provider: selectedProvider,
          hasImage: !!imageUrl,
          messageCount: currentMessages.length,
        })

        // Send the message to the API with the selected provider
        // Note: For images, the API will automatically use Google provider
        // For freemium users, the API will ignore the provider and use the cheapest one
        console.log("Preparing API request")

        const apiRequestBody = {
          messages: currentMessages.map((m) => ({
            role: m.role,
            content: m.content,
            imageUrl: m.imageUrl,
          })),
          model: selectedProvider,
        }

        console.log("Sending request to chat API")
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiRequestBody),
        })

        console.log("Chat API response status:", response.status)

        if (!response.ok) {
          let errorData
          try {
            errorData = await response.json()
            console.error("API error response:", errorData)
          } catch (jsonError) {
            console.error("Error parsing error response:", jsonError)
            throw new Error(`Server error: ${response.status} ${response.statusText}`)
          }

          throw new Error(errorData.error || "Failed to get a response")
        }

        let data
        try {
          data = await response.json()
          console.log("API response received successfully")
        } catch (jsonError) {
          console.error("Error parsing API response:", jsonError)
          throw new Error("Failed to parse response from server")
        }

        // Create assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.content,
          timestamp: Date.now(),
        }

        console.log("Created assistant message, content length:", data.content.length)

        // Update session with assistant message
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id === currentSessionId) {
              return {
                ...session,
                messages: [...session.messages, assistantMessage],
                lastUpdated: Date.now(),
              }
            }
            return session
          }),
        )

        // Save message to database if user is authenticated
        if (status === "authenticated" && isDbAvailable) {
          try {
            console.log("Saving assistant message to database")
            await addMessageToChatSession(currentSessionId, assistantMessage)
          } catch (error) {
            console.error("Error saving assistant message to database:", error)
          }
        }

        // Scroll to bottom after receiving response
        scrollToBottom()
      } catch (error) {
        console.error("Error sending message:", error)
        // Show an error message to the user
        setErrorMessage(error instanceof Error ? error.message : "Failed to get a response. Please try again.")
      } finally {
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      setIsLoading(false)
      setErrorMessage("An unexpected error occurred. Please try again.")
    }
  }

  // Format timestamp to relative time (e.g., "5 minutes ago")
  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(timestamp, { addSuffix: true })
  }

  // Get a preview of the last message in a session
  const getSessionPreview = (session: ChatSession) => {
    if (session.messages.length === 0) return "New conversation"
    const lastMessage = session.messages[session.messages.length - 1]
    const preview = lastMessage.content.slice(0, 30)
    return preview.length < lastMessage.content.length ? `${preview}...` : preview
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  // Navigate to profile page
  const goToProfile = () => {
    router.push("/profile")
  }

  // Render upgrade modal
  const renderUpgradeModal = () => {
    if (!showUpgradeModal) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Upgrade Your Plan</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">Upgrade to access more features:</p>

          <div className="mb-6 space-y-4">
            <div className="rounded-md bg-gray-100 p-4 dark:bg-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">Registered (Free)</h3>
              <ul className="mt-2 list-inside list-disc text-sm text-gray-700 dark:text-gray-300">
                <li>Select from multiple providers</li>
                <li>Upload and analyze images</li>
                <li>1000 tokens per message</li>
              </ul>
              {userTier === "freemium" && (
                <button
                  onClick={() => {
                    setShowUpgradeModal(false)
                    signIn("google")
                  }}
                  className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Sign Up with Google
                </button>
              )}
            </div>

            <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">Premium</h3>
              <ul className="mt-2 list-inside list-disc text-sm text-blue-800 dark:text-blue-200">
                <li>All registered features</li>
                <li>Access to Grok AI</li>
                <li>1500 tokens per message</li>
              </ul>
              <button
                onClick={() => {
                  setShowUpgradeModal(false)
                  // Implement premium upgrade flow
                  alert("Premium upgrade coming soon!")
                }}
                className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render user profile section
  const renderUserProfile = () => (
    <div className="mt-auto border-t border-gray-200 p-4 dark:border-gray-700">
      {status === "authenticated" ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              {session.user?.image ? (
                <img
                  src={session.user.image || "/placeholder.svg"}
                  alt={session.user.name || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700">
                  <UserCircle className="h-6 w-6 text-gray-500" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-800"></div>
            </div>
            <div className="ml-3 flex flex-col">
              <span className="text-sm font-medium">{session.user?.name}</span>
              <div className="flex items-center">
                <span className="text-xs text-gray-500">{userTier}</span>
                {userTier === "premium" && <Crown className="ml-1 h-3 w-3 text-yellow-500" />}
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={goToProfile}
                    className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  >
                    <UserCircle className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Profile</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => signOut()}
                    className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  >
                    <LogIn className="h-5 w-5 rotate-180" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
              <UserCircle className="h-6 w-6 text-gray-500" />
            </div>
            <div className="ml-3">
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          </div>
          <button
            onClick={() => signIn("google")}
            className="flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <LogIn className="mr-1 h-3 w-3" />
            Sign In
          </button>
        </div>
      )}
    </div>
  )

  // Update the sidebar render function to fix the header layout
  const renderSidebar = () => (
    <div
      className={`${isMobile ? "fixed inset-0 z-50 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out" : "w-64 border-r border-gray-200 dark:border-gray-700"} flex flex-col ${isMobile && !isMobileMenuOpen ? "-translate-x-full" : "translate-x-0"}`}
    >
      <div className="p-4 flex items-center justify-between border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Chatbot</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="ml-2 h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={createNewSession}
                  aria-label="New chat"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New chat</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {!isMobile && <ThemeToggle />}
      </div>

      {/* Provider selector in its own row */}
      <div className="p-4 border-b flex items-center justify-between">
        <span className="text-sm text-gray-500">Provider: </span>
        {tierLimit.canSelectProvider ? (
          <ProviderSelector
            onSelect={handleProviderChange}
            defaultValue={selectedProvider}
            availableProviders={tierLimit.availableProviders}
          />
        ) : (
          <div className="text-sm text-gray-500">
            {tierLimit.availableProviders[0]}
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="ml-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Upgrade
            </button>
          </div>
        )}
      </div>

      {/* Add Search */}
      <div className="p-4 border-b">
        <SearchChat onSearch={handleSearch} />
      </div>

      <div className="p-4 text-sm text-gray-600">{searchQuery ? "Search results:" : "Your chat sessions:"}</div>

      {/* Chat Sessions List */}
      <div className="flex-1 overflow-auto" role="list" aria-label="Chat sessions">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className={`p-3 flex justify-between items-start cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${session.id === currentSessionId ? "bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-500" : ""}`}
            onClick={() => switchSession(session.id)}
            role="listitem"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{session.name}</div>
              <div className="text-xs text-gray-500 truncate">{getSessionPreview(session)}</div>
              <div className="text-xs text-gray-400 mt-1">{formatTimestamp(session.lastUpdated)}</div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="ml-2 text-gray-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                    aria-label="Delete session"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete chat</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>

      {/* User profile section - moved to bottom */}
      {renderUserProfile()}
    </div>
  )

  // Update the mobile header to include the provider selector
  return (
    <div className="fixed inset-0 flex bg-white dark:bg-gray-900 dark:text-gray-100">
      {/* Sidebar for desktop or mobile when open */}
      {(!isMobile || isMobileMenuOpen) && renderSidebar()}

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col">
        {/* Mobile Header with Menu Button */}
        {isMobile && (
          <div className="sticky top-0 z-10 p-3 bg-white dark:bg-gray-900 flex items-center justify-between">
            <div className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
                      onClick={() => setIsMobileMenuOpen(true)}
                      aria-label="Open menu"
                    >
                      <MenuIcon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open menu</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <h1 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                {currentSession?.name || "Chatbot"}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {tierLimit.canSelectProvider && (
                <ProviderSelector
                  onSelect={handleProviderChange}
                  defaultValue={selectedProvider}
                  availableProviders={tierLimit.availableProviders}
                />
              )}
              <ThemeToggle />
            </div>
          </div>
        )}

        {/* Token count indicator */}
        {currentSession && (
          <div className="px-4 py-1 text-xs text-gray-500 flex justify-between">
            <span>
              Tier: {userTier}{" "}
              {userTier !== "premium" && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Upgrade
                </button>
              )}
            </span>
            <span>
              Tokens: {tokenCount} / {tierLimit.maxTokens}
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm flex items-center">
            <AlertCircleIcon className="h-4 w-4 mr-2" />
            {errorMessage}
          </div>
        )}

        {/* Chat Area - Flex-grow to take available space but allow input to be visible */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900"
          style={{ scrollBehavior: "smooth" }}
          role="region"
          aria-label="Chat messages"
        >
          {messages.map((m) => (
            <div key={m.id} className={`mb-3 md:mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
              <div
                className={`inline-block p-3 md:p-4 rounded-lg ${
                  m.role === "user"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700"
                } max-w-[85%] md:max-w-[75%]`}
              >
                {m.imageUrl && (
                  <div className="mb-3">
                    <img
                      src={m.imageUrl || "/placeholder.svg"}
                      alt="Uploaded content"
                      className="max-w-full rounded-md"
                      style={{ maxHeight: "300px" }}
                    />
                  </div>
                )}
                {m.role === "assistant" ? formatMessageContent(m.content) : m.content}
              </div>
              <div className="text-xs text-gray-500 mt-1">{formatTimestamp(m.timestamp)}</div>
            </div>
          ))}
          {isLoading && (
            <div className="mb-3 md:mb-4 text-left">
              <div className="inline-block p-2 rounded-lg bg-gray-200 dark:bg-gray-800">
                <div className="flex space-x-2">
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-sm">
          {imagePreview && (
            <div className="p-2 flex items-center">
              <div className="relative inline-block">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Selected image"
                  className="h-16 w-auto rounded-md object-cover"
                />
                <button
                  className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 rounded-full"
                  onClick={() => {
                    setSelectedImage(null)
                    setImagePreview(null)
                  }}
                  aria-label="Remove image"
                >
                  <XCircleIcon className="h-5 w-5 text-gray-500 hover:text-red-500" />
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="p-3 md:p-4">
            <div className="max-w-3xl mx-auto relative">
              <div className="bg-white dark:bg-gray-800 rounded-lg flex items-center border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition-shadow duration-200">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask a follow up..."
                  className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-2 md:py-3 px-3 md:px-4 min-h-[40px] max-h-[300px] overflow-auto text-sm md:text-base dark:text-white"
                  style={{ outline: "none" }}
                  disabled={isLoading || isUploading}
                  aria-label="Message input"
                />
                <div className="flex items-center pr-2 space-x-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={clearInput}
                          className="text-gray-500 dark:text-gray-400 h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                          disabled={isLoading || isUploading || (!input && !selectedImage)}
                          aria-label="Clear input"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear input</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    aria-label="Attach image"
                  />

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          className="text-gray-500 dark:text-gray-400 h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                          disabled={isLoading || isUploading || !tierLimit.canUploadImages}
                          aria-label="Attach image"
                        >
                          <PaperclipIcon className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{tierLimit.canUploadImages ? "Attach image" : "Upgrade to attach images"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="submit"
                          className="text-gray-500 dark:text-gray-400 h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                          disabled={isLoading || isUploading || (!input.trim() && !selectedImage)}
                          aria-label="Send message"
                        >
                          <SendIcon className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send message</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Upgrade Modal */}
      {renderUpgradeModal()}
    </div>
  )
}
