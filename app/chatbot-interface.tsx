"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import type React from "react"
import { PlusIcon, SendIcon, TrashIcon, MenuIcon, XIcon, LogOut, LogIn } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { SearchChat } from "@/components/search-chat"
import { ThemeToggle } from "@/components/theme-toggle"
import { useChat } from "ai/react"
import { useSession, signIn, signOut } from "next-auth/react"
import { v4 as uuidv4 } from "uuid"

// Define types for our chat data
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface ChatSession {
  id: string
  name: string
  messages: Message[]
  last_updated: string
}

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

export default function ChatbotInterface() {
  const { data: session } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // State for chat sessions
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Refs for scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Add search state
  const [searchQuery, setSearchQuery] = useState("")

  // Use the AI SDK's useChat hook for streaming
  const {
    messages: chatMessages,
    input,
    handleInputChange,
    handleSubmit: handleChatSubmit,
    isLoading,
    setMessages,
    error,
  } = useChat({
    api: "/api/chat",
    initialMessages: [],
    onFinish: (message) => {
      // When a message is finished, update the session in the database
      if (currentSessionId && session?.user) {
        saveMessageToDatabase(currentSessionId, {
          id: uuidv4(),
          role: "assistant",
          content: message.content,
        })
      }
    },
    onError: (error) => {
      console.error("Chat error:", error)
    },
  })

  // Add this after the useChat hook
  useEffect(() => {
    if (error) {
      console.error("Chat error:", error)
    }
  }, [error])

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

  // Load sessions from database or localStorage
  useEffect(() => {
    const loadSessions = async () => {
      if (session?.user) {
        // User is authenticated, load from database
        try {
          const response = await fetch("/api/chat-sessions")
          if (response.ok) {
            const data = await response.json()
            setSessions(data)

            // Set current session to the most recently updated one
            if (data.length > 0) {
              const mostRecent = data.sort((a: ChatSession, b: ChatSession) => {
                return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
              })[0]
              setCurrentSessionId(mostRecent.id)

              // Load messages for this session
              const messagesResponse = await fetch(`/api/chat-sessions/${mostRecent.id}/messages`)
              if (messagesResponse.ok) {
                const messagesData = await messagesResponse.json()
                setMessages(
                  messagesData.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    createdAt: new Date(m.timestamp),
                  })),
                )
              }
            } else {
              createNewSession()
            }
          } else {
            // Fallback to localStorage if API fails
            loadFromLocalStorage()
          }
        } catch (error) {
          console.error("Error loading sessions:", error)
          loadFromLocalStorage()
        }
      } else {
        // User is not authenticated, load from localStorage
        loadFromLocalStorage()
      }
    }

    const loadFromLocalStorage = () => {
      const savedSessions = localStorage.getItem("chatSessions")
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions) as ChatSession[]
        setSessions(parsedSessions)

        // Set current session to the most recently updated one
        if (parsedSessions.length > 0) {
          const mostRecent = parsedSessions.sort((a, b) => {
            return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
          })[0]
          setCurrentSessionId(mostRecent.id)

          // Load messages for this session
          if (mostRecent.messages && mostRecent.messages.length > 0) {
            setMessages(
              mostRecent.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: new Date(m.timestamp),
              })),
            )
          }
        } else {
          createNewSession()
        }
      } else {
        // Create a default session if none exists
        createNewSession()
      }
    }

    loadSessions()
  }, [session, setMessages])

  // Scroll to bottom when messages change or when switching sessions
  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, currentSessionId])

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0 && !session?.user) {
      localStorage.setItem("chatSessions", JSON.stringify(sessions))
    }
  }, [sessions, session])

  // Save message to database
  const saveMessageToDatabase = async (sessionId: string, message: { id: string; role: string; content: string }) => {
    try {
      await fetch(`/api/chat-sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      })
    } catch (error) {
      console.error("Error saving message to database:", error)
    }
  }

  // Create a new chat session
  const createNewSession = async () => {
    const newSessionId = uuidv4()
    const newSessionName = `Chat ${sessions.length + 1}`

    if (session?.user) {
      // User is authenticated, create session in database
      try {
        const response = await fetch("/api/chat-sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newSessionName }),
        })

        if (response.ok) {
          const data = await response.json()
          setSessions((prev) => [...prev, { ...data, messages: [] }])
          setCurrentSessionId(data.id)
          setMessages([])
        } else {
          // Fallback to local if API fails
          createLocalSession(newSessionId, newSessionName)
        }
      } catch (error) {
        console.error("Error creating session:", error)
        createLocalSession(newSessionId, newSessionName)
      }
    } else {
      // User is not authenticated, store locally
      createLocalSession(newSessionId, newSessionName)
    }

    // Close mobile menu after creating a new session
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }
  }

  const createLocalSession = (id: string, name: string) => {
    const newSession: ChatSession = {
      id,
      name,
      messages: [],
      last_updated: new Date().toISOString(),
    }

    setSessions((prev) => [...prev, newSession])
    setCurrentSessionId(id)
    setMessages([])
  }

  // Delete a chat session
  const deleteSession = async (sessionId: string) => {
    if (session?.user) {
      // User is authenticated, delete from database
      try {
        const response = await fetch(`/api/chat-sessions/${sessionId}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          console.error("Error deleting session from database")
        }
      } catch (error) {
        console.error("Error deleting session:", error)
      }
    }

    setSessions((prev) => prev.filter((s) => s.id !== sessionId))

    // If we deleted the current session, switch to another one
    if (sessionId === currentSessionId) {
      const remainingSessions = sessions.filter((s) => s.id !== sessionId)
      if (remainingSessions.length > 0) {
        const nextSession = remainingSessions[0]
        setCurrentSessionId(nextSession.id)

        // Load messages for this session
        if (nextSession.messages && nextSession.messages.length > 0) {
          setMessages(
            nextSession.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: new Date(m.timestamp),
            })),
          )
        } else {
          setMessages([])
        }
      } else {
        createNewSession()
      }
    }
  }

  // Switch to a different session
  const switchSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId)

    if (session?.user) {
      // Load messages from database
      try {
        const response = await fetch(`/api/chat-sessions/${sessionId}/messages`)
        if (response.ok) {
          const data = await response.json()
          setMessages(
            data.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: new Date(m.timestamp),
            })),
          )
        }
      } catch (error) {
        console.error("Error loading messages:", error)
      }
    } else {
      // Load messages from local session
      const currentSession = sessions.find((s) => s.id === sessionId)
      if (currentSession && currentSession.messages) {
        setMessages(
          currentSession.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date(m.timestamp),
          })),
        )
      } else {
        setMessages([])
      }
    }

    // Close mobile menu after switching sessions
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) return

    if (!currentSessionId) {
      await createNewSession()
    }

    // Create user message
    const userMessage = {
      id: uuidv4(),
      role: "user",
      content: input.trim(),
    }

    // If user is authenticated, save message to database
    if (session?.user && currentSessionId) {
      saveMessageToDatabase(currentSessionId, userMessage)
    }

    // Use the AI SDK's handleSubmit
    handleChatSubmit(e)
  }

  // Format timestamp to relative time (e.g., "5 minutes ago")
  const formatTimestamp = (timestamp: string | number) => {
    const date = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp)
    return formatDistanceToNow(date, { addSuffix: true })
  }

  // Get a preview of the last message in a session
  const getSessionPreview = (session: ChatSession) => {
    if (!session.messages || session.messages.length === 0) return "New conversation"
    const lastMessage = session.messages[session.messages.length - 1]
    const preview = lastMessage.content.slice(0, 30)
    return preview.length < lastMessage.content.length ? `${preview}...` : preview
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  // Render the sidebar
  const renderSidebar = () => (
    <div
      className={`${isMobile ? "fixed inset-0 z-50 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out" : "w-64 border-r border-gray-200 dark:border-gray-700"} flex flex-col ${isMobile && !isMobileMenuOpen ? "-translate-x-full" : "translate-x-0"}`}
    >
      <div className="p-4 flex items-center justify-between border-b dark:border-gray-700">
        <h1 className="text-xl font-medium text-gray-800 dark:text-gray-200">Chatbot</h1>
        <div className="flex items-center">
          <button
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
            onClick={createNewSession}
          >
            <PlusIcon className="h-5 w-5" />
          </button>
          {isMobile ? (
            <button
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <XIcon className="h-5 w-5" />
            </button>
          ) : (
            <ThemeToggle />
          )}
        </div>
      </div>

      {/* User Authentication */}
      <div className="p-4 border-b dark:border-gray-700">
        {session ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {session.user?.image && (
                <img
                  src={session.user.image || "/placeholder.svg"}
                  alt={session.user.name || "User"}
                  className="h-8 w-8 rounded-full mr-2"
                />
              )}
              <span className="text-sm font-medium truncate">{session.user?.name || session.user?.email}</span>
            </div>
            <button
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            className="flex items-center justify-center w-full py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => signIn()}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign in to save chats
          </button>
        )}
      </div>

      {/* Add Search */}
      <div className="p-4 border-b">
        <SearchChat onSearch={handleSearch} />
      </div>

      <div className="p-4 text-sm text-gray-600 dark:text-gray-400">
        {searchQuery ? "Search results:" : "Your chat sessions:"}
      </div>

      {/* Chat Sessions List */}
      <div className="flex-1 overflow-auto">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className={`p-3 flex justify-between items-start cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${session.id === currentSessionId ? "bg-gray-100 dark:bg-gray-800" : ""}`}
            onClick={() => switchSession(session.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{session.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{getSessionPreview(session)}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {formatTimestamp(session.last_updated)}
              </div>
            </div>
            <button
              className="ml-2 text-gray-400 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation()
                deleteSession(session.id)
              }}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 flex bg-white dark:bg-gray-900 dark:text-gray-100">
      {/* Sidebar for desktop or mobile when open */}
      {(!isMobile || isMobileMenuOpen) && renderSidebar()}

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col">
        {/* Mobile Header with Menu Button */}
        {isMobile && (
          <div className="sticky top-0 z-10 p-3 border-b bg-white dark:bg-gray-900 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              <button
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <MenuIcon className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                {currentSession?.name || "Chatbot"}
              </h1>
            </div>
            <ThemeToggle />
          </div>
        )}

        {/* Chat Area - Flex-grow to take available space but allow input to be visible */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 md:p-4" style={{ scrollBehavior: "smooth" }}>
          {chatMessages.map((m) => (
            <div key={m.id} className={`mb-3 md:mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
              <div
                className={`inline-block p-3 md:p-4 rounded-lg ${
                  m.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                } max-w-[85%] md:max-w-[75%]`}
              >
                {m.role === "assistant" ? m.content : m.content}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {m.createdAt ? formatTimestamp(m.createdAt.getTime()) : "Just now"}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="mb-3 md:mb-4 text-left">
              <div className="inline-block p-2 rounded-lg bg-gray-200 dark:bg-gray-800">
                <div className="flex space-x-2">
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
          <form onSubmit={handleSubmit} className="p-3 md:p-4">
            <div className="max-w-3xl mx-auto relative">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Send a message..."
                  className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-2 md:py-3 px-3 md:px-4 h-10 md:h-12 max-h-32 md:max-h-48 overflow-auto text-sm md:text-base dark:text-gray-200"
                  style={{ outline: "none" }}
                  disabled={isLoading}
                />
                <div className="flex items-center pr-2">
                  <button
                    type="submit"
                    className="text-gray-500 h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                    disabled={isLoading || !input.trim()}
                  >
                    <SendIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

