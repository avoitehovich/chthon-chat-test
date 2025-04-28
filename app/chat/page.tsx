import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../api/auth/[...nextauth]/route"
import ChatbotInterface from "../chatbot-interface"

export default async function ChatPage() {
  const session = await getServerSession(authOptions)

  // If user is not authenticated, redirect to landing page
  if (!session) {
    redirect("/")
  }

  return <ChatbotInterface />
}
