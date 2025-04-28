"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Crown, LogOut, ArrowLeft, Settings, User, MessageSquare, ImageIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { tierLimits, type UserTier } from "@/types/user"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Redirect to home if not authenticated
  if (status === "unauthenticated") {
    router.push("/")
    return null
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const userTier = (session?.user?.tier as UserTier) || "registered"
  const tierLimit = tierLimits[userTier]

  const handleSignOut = async () => {
    setIsLoading(true)
    await signOut({ callbackUrl: "/" })
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Chat
        </Button>
        <h1 className="text-2xl font-bold">Your Profile</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* User Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-100">
              {session.user?.image ? (
                <img
                  src={session.user.image || "/placeholder.svg"}
                  alt={session.user.name || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-gray-400" />
              )}
            </div>
            <CardTitle>{session.user?.name || "User"}</CardTitle>
            <CardDescription>{session.user?.email}</CardDescription>
            <div className="mt-2 flex items-center justify-center">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {userTier}
                {userTier === "premium" && <Crown className="ml-1 inline h-3 w-3 text-yellow-500" />}
              </span>
            </div>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={handleSignOut} disabled={isLoading}>
              <LogOut className="mr-2 h-4 w-4" />
              {isLoading ? "Signing out..." : "Sign Out"}
            </Button>
          </CardFooter>
        </Card>

        {/* Subscription Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Your Plan</CardTitle>
            <CardDescription>Current subscription and usage limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-2 font-medium">Current Plan: {userTier.charAt(0).toUpperCase() + userTier.slice(1)}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {/* Freemium tier has been removed */}
                {userTier === "registered" &&
                  "Standard access with essential features. Upgrade to premium for more capabilities."}
                {userTier === "premium" && "Full access to all features and capabilities."}
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium">Your Limits</h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MessageSquare className="mr-2 h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">Tokens</span>
                    </div>
                    <span className="text-sm font-bold">{tierLimit.maxTokens}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Maximum tokens per message</p>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Settings className="mr-2 h-5 w-5 text-purple-500" />
                      <span className="text-sm font-medium">Providers</span>
                    </div>
                    <span className="text-sm font-bold">{tierLimit.availableProviders.length}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Available AI providers</p>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ImageIcon className="mr-2 h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium">Images</span>
                    </div>
                    <span className="text-sm font-bold">{tierLimit.canUploadImages ? "Yes" : "No"}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Image upload capability</p>
                </div>
              </div>
            </div>

            {userTier !== "premium" && (
              <>
                <Separator />

                <div>
                  <h3 className="mb-2 font-medium">Upgrade Your Plan</h3>
                  <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Unlock more features and higher limits with our premium plan.
                  </p>
                  <Button className="w-full sm:w-auto" onClick={() => alert("Premium upgrade coming soon!")}>
                    Upgrade to Premium
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
