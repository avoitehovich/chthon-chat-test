"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import type React from "react"
import { PlusIcon, SendIcon, TrashIcon, MenuIcon, XIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { SearchChat } from "@/components/search-chat"
import { ThemeToggle } from "@/components/theme-toggle"

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
  lastUpdated: number
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
  // State for the current input and loading state
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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

  // Load sessions from localStorage on initial render
  useEffect(() => {
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
  }, [])

  // Scroll to bottom when messages change or when switching sessions
  useEffect(() => {
    scrollToBottom()
  }, [messages, currentSessionId])

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("chatSessions", JSON.stringify(sessions))
    }
  }, [sessions])

  // Create a new chat session
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      name: `Chat ${sessions.length + 1}`,
      messages: [],
      lastUpdated: Date.now(),
    }

    setSessions((prev) => [...prev, newSession])
    setCurrentSessionId(newSession.id)

    // Close mobile menu after creating a new session
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }
  }

  // Delete a chat session
  const deleteSession = (sessionId: string) => {
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentSessionId) return

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    }

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
    setInput("")
    setIsLoading(true)

    // Scroll to bottom after sending message
    scrollToBottom()

    try {
      // Get the updated messages for the current session
      const currentMessages = updatedSessions.find((s) => s.id === currentSessionId)?.messages || []

      // Send the message to the API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const data = await response.json()

      // Create assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: Date.now(),
      }

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

      // Scroll to bottom after receiving response
      scrollToBottom()
    } catch (error) {
      console.error("Error sending message:", error)
      // Optionally show an error message to the user
    } finally {
      setIsLoading(false)
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

      {/* Add Search */}
      <div className="p-4 border-b">
        <SearchChat onSearch={handleSearch} />
      </div>

      <div className="p-4 text-sm text-gray-600">{searchQuery ? "Search results:" : "Your chat sessions:"}</div>

      {/* Chat Sessions List */}
      <div className="flex-1 overflow-auto">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className={`p-3 flex justify-between items-start cursor-pointer hover:bg-gray-100 ${session.id === currentSessionId ? "bg-gray-100" : ""}`}
            onClick={() => switchSession(session.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{session.name}</div>
              <div className="text-xs text-gray-500 truncate">{getSessionPreview(session)}</div>
              <div className="text-xs text-gray-400 mt-1">{formatTimestamp(session.lastUpdated)}</div>
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
          {messages.map((m) => (
            <div key={m.id} className={`mb-3 md:mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
              <div
                className={`inline-block p-3 md:p-4 rounded-lg ${
                  m.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                } max-w-[85%] md:max-w-[75%]`}
              >
                {m.role === "assistant" ? formatMessageContent(m.content) : m.content}
              </div>
              <div className="text-xs text-gray-500 mt-1">{formatTimestamp(m.timestamp)}</div>
            </div>
          ))}
          {isLoading && (
            <div className="mb-3 md:mb-4 text-left">
              <div className="inline-block p-2 rounded-lg bg-gray-200">
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
                  className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-2 md:py-3 px-3 md:px-4 h-10 md:h-12 max-h-32 md:max-h-48 overflow-auto text-sm md:text-base"
                  style={{ outline: "none" }}
                  disabled={isLoading}
                />
                <div className="flex items-center pr-2">
                  <button
                    type="submit"
                    className="text-gray-500 h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-200"
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
