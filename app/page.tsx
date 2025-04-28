import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "./api/auth/[...nextauth]/route"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, MessageSquare, Shield, Zap } from "lucide-react"

export default async function LandingPage() {
  const session = await getServerSession(authOptions)

  // If user is already authenticated, redirect them to the chat interface
  if (session) {
    return <meta httpEquiv="refresh" content="0;url=/chat" />
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold">Chthon Chat</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signin">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Advanced AI Chat <span className="text-blue-600">for Everyone</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-600">
            Experience the power of multiple AI models in one place. Ask questions, analyze images, and get intelligent
            responses.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/auth/signin">
              <Button size="lg" className="h-12 px-8">
                Sign Up Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Powerful Features</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="mb-4 rounded-full bg-blue-100 p-3 w-12 h-12 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Multiple AI Models</h3>
              <p className="text-gray-600">
                Choose from various AI providers including OpenAI, DeepSeek, Amazon, and more.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="mb-4 rounded-full bg-green-100 p-3 w-12 h-12 flex items-center justify-center">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Image Analysis</h3>
              <p className="text-gray-600">
                Upload images and get detailed analysis and insights from advanced vision models.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="mb-4 rounded-full bg-purple-100 p-3 w-12 h-12 flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Secure & Private</h3>
              <p className="text-gray-600">
                Your conversations are private and secure with our enterprise-grade security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Simple Pricing</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
            <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-bold">Registered</h3>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">Free</span>
              </div>
              <p className="mb-6 text-gray-600">Perfect for casual users who want to explore AI capabilities.</p>
              <ul className="mb-8 space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <span>Access to multiple AI providers</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <span>Image upload and analysis</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <span>1,000 tokens per message</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <span>Save chat history</span>
                </li>
              </ul>
              <Link href="/auth/signin" className="w-full">
                <Button className="w-full">Sign Up with Google</Button>
              </Link>
            </div>
            <div className="rounded-lg border-2 border-blue-600 bg-white p-8 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-bold">Premium</h3>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                  Coming Soon
                </span>
              </div>
              <p className="mb-6 text-gray-600">For power users who need advanced features and higher limits.</p>
              <ul className="mb-8 space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <span>All Registered features</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <span>Access to XAI/Grok</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <span>1,500 tokens per message</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold">Ready to get started?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-blue-100">
            Join thousands of users who are already experiencing the power of AI chat.
          </p>
          <Link href="/auth/signin">
            <Button size="lg" variant="secondary" className="h-12 px-8">
              Sign Up Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between space-y-6 md:flex-row md:space-y-0">
            <div className="flex items-center">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-lg font-bold">Chthon Chat</span>
            </div>
            <div className="flex space-x-6">
              <Link href="#" className="text-gray-600 hover:text-gray-900">
                Terms
              </Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900">
                Privacy
              </Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900">
                Contact
              </Link>
            </div>
            <div className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} Chthon Chat. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
