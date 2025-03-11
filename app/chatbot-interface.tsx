"use client"
import { useChat } from "ai/react"
import { PlusIcon, LayoutGridIcon, SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useRef } from "react"

export default function ChatbotInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error)
    },
  })

  // Create a ref for the chat container to enable auto-scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Log messages for debugging
  useEffect(() => {
    console.log("Current messages:", messages)
  }, [messages])

  // Log errors
  useEffect(() => {
    if (error) {
      console.error("Chat error:", error)
    }
  }, [error])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Format message content for better display
  const formatMessageContent = (content: string) => {
    // Split the content into sections
    const sections = content.split("\n\n")

    return sections.map((section, index) => {
      const lines = section.split("\n")

      return (
        <div key={index} className={index > 0 ? "mt-4" : ""}>
          {lines.map((line, lineIndex) => {
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

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 flex items-center justify-between border-b">
          <h1 className="text-xl font-medium text-gray-800">Chatbot</h1>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <PlusIcon className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 text-sm text-gray-600">Login to save and revisit previous chats!</div>
        <div className="flex-1"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-2 border-b flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <LayoutGridIcon className="h-4 w-4" />
          </Button>
          <Select defaultValue="small-model">
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small-model">Small model</SelectItem>
              <SelectItem value="medium-model">Medium model</SelectItem>
              <SelectItem value="large-model">Large model</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chat Area */}
        <div ref={chatContainerRef} className="flex-1 overflow-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
              <div
                className={`inline-block p-3 rounded-lg ${m.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              >
                {m.role === "assistant" ? formatMessageContent(m.content) : m.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="mb-4 text-left">
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

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="max-w-3xl mx-auto relative">
            <div className="bg-gray-100 rounded-lg flex items-center">
              <textarea
                value={input}
                onChange={handleInputChange}
                placeholder="Send a message..."
                className="flex-1 bg-transparent border-0 focus:ring-0 resize-none py-3 px-4 h-12 max-h-48 overflow-auto"
                style={{ outline: "none" }}
                disabled={isLoading}
              />
              <div className="flex items-center pr-2">
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="text-gray-500"
                  disabled={isLoading || !input.trim()}
                >
                  <SendIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

