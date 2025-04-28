"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { MessageSquare, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ErrorPage() {
  const [errorMessage, setErrorMessage] = useState<string>("")
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get("error")

    if (error === "google_account") {
      const email = searchParams.get("email") || ""
      setErrorMessage(`This email (${email}) is already registered with Google. Please sign in with Google instead.`)
    } else if (error === "Configuration") {
      setErrorMessage("There is a problem with the server configuration. Please try again later.")
    } else if (error === "AccessDenied") {
      setErrorMessage("Access denied. You do not have permission to sign in.")
    } else if (error === "Verification") {
      setErrorMessage("The verification link may have expired or has already been used.")
    } else {
      setErrorMessage("An error occurred during authentication. Please try again.")
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-10 shadow-md dark:bg-gray-800">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-2xl font-bold">Chthon Chat</span>
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">Authentication Error</h1>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>

        <div className="mt-6 flex flex-col space-y-4">
          <Button onClick={() => router.push("/auth/signin")} className="w-full">
            Back to Sign In
          </Button>
          <Button variant="outline" onClick={() => router.push("/")} className="w-full">
            Go to Home Page
          </Button>
        </div>
      </div>
    </div>
  )
}
