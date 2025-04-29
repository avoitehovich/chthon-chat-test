"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function ErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  let errorMessage = "An unknown error occurred during authentication."
  let errorDescription = "Please try again or contact support if the problem persists."

  // Map error codes to user-friendly messages
  if (error === "Configuration") {
    errorMessage = "Server configuration error"
    errorDescription = "There is a problem with the server configuration. Please contact support."
  } else if (error === "AccessDenied") {
    errorMessage = "Access denied"
    errorDescription =
      "You do not have permission to sign in. This could be due to restrictions set by the application or the OAuth provider."
  } else if (error === "Verification") {
    errorMessage = "Unable to verify email address"
    errorDescription = "The sign in link is no longer valid. It may have been used already or it may have expired."
  } else if (error === "OAuthSignin") {
    errorMessage = "Error starting OAuth sign in"
    errorDescription = "There was a problem initiating the OAuth sign in process. Please try again."
  } else if (error === "OAuthCallback") {
    errorMessage = "Error completing OAuth sign in"
    errorDescription =
      "There was a problem during the OAuth callback process. This could be due to a mismatch in the expected response."
  } else if (error === "OAuthCreateAccount") {
    errorMessage = "Could not create OAuth account"
    errorDescription = "There was a problem creating an account with the OAuth provider credentials."
  } else if (error === "EmailCreateAccount") {
    errorMessage = "Could not create email account"
    errorDescription = "There was a problem creating an account with the provided email address."
  } else if (error === "Callback") {
    errorMessage = "Error during callback"
    errorDescription = "There was a problem during the authentication callback process."
  } else if (error === "OAuthAccountNotLinked") {
    errorMessage = "Account not linked"
    errorDescription = "To confirm your identity, sign in with the same account you used originally."
  } else if (error === "EmailSignin") {
    errorMessage = "Error sending email"
    errorDescription = "There was a problem sending the sign in email. Please try again."
  } else if (error === "CredentialsSignin") {
    errorMessage = "Invalid credentials"
    errorDescription = "The credentials you provided are invalid. Please check your username and password."
  } else if (error === "SessionRequired") {
    errorMessage = "Authentication required"
    errorDescription = "You must be signed in to access this page."
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Authentication Error</h1>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{errorMessage}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{errorDescription}</p>

          <div className="text-sm text-gray-500 dark:text-gray-500 mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
            <p className="font-semibold mb-1">Debug information:</p>
            <p className="font-mono">Error code: {error || "none"}</p>
          </div>

          <div className="flex flex-col space-y-3">
            <Link
              href="/auth/signin"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-md transition-colors"
            >
              Continue as Guest
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
