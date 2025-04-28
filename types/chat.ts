export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  imageUrl?: string
}

export interface ChatSession {
  id: string
  name: string
  messages: Message[]
  lastUpdated: number
  userId: string
}
