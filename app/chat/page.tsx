import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "../api/auth/[...nextauth]/route"
import ChatbotInterface from "../chatbot-interface"

export const metadata = {
  title: "Chat | Chthon Chat",
  description: "Chat with our AI assistant",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default async function ChatPage() {
  const session = await getServerSession(authOptions)

  // If user is not authenticated, redirect to landing page
  if (!session) {
    redirect("/")
  }

  return <ChatbotInterface />
}
