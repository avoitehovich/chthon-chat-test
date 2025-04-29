"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Users, BarChart, Settings, AlertCircle, Database, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [adminKey, setAdminKey] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)

  const authenticate = async () => {
    setAuthError(null)

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminKey }),
      })

      if (response.ok) {
        setIsAuthorized(true)
      } else {
        const data = await response.json()
        setAuthError(data.error || "Authentication failed")
      }
    } catch (err) {
      setAuthError("Failed to authenticate. Please try again.")
    }
  }

  const initializeDatabase = async () => {
    setIsInitializing(true)

    try {
      const response = await fetch("/api/admin/init-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Database Initialized",
          description: "The database has been successfully initialized.",
        })
      } else {
        const data = await response.json()
        toast({
          title: "Initialization Failed",
          description: data.error || "Failed to initialize database",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Initialization Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  const migrateFromSupabase = async () => {
    setIsMigrating(true)

    try {
      const response = await fetch("/api/admin/migrate-from-supabase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Migration Successful",
          description: "Data has been successfully migrated from Supabase to Vercel Postgres.",
        })
      } else {
        const data = await response.json()
        toast({
          title: "Migration Failed",
          description: data.error || "Failed to migrate data from Supabase",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Migration Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsMigrating(false)
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-blue-600" />
              Admin Authentication
            </CardTitle>
            <CardDescription>Enter your admin key to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {authError}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminKey">Admin Key</Label>
                <Input
                  id="adminKey"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter your admin key"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={authenticate} disabled={!adminKey} className="w-full">
              Authenticate
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your chatbot application settings and users</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-blue-600" />
                User Management
              </CardTitle>
              <CardDescription>Manage user tiers and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                View and modify user tiers, set custom permissions, and manage access to features.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push("/admin/users")} className="w-full">
                Manage Users
              </Button>
            </CardFooter>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="mr-2 h-5 w-5 text-purple-600" />
                Analytics
              </CardTitle>
              <CardDescription>View usage statistics and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Monitor API usage, costs, and user engagement across different tiers.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push("/admin/analytics")} className="w-full">
                View Analytics
              </Button>
            </CardFooter>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5 text-green-600" />
                System Settings
              </CardTitle>
              <CardDescription>Configure global application settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Adjust default tier settings, API configurations, and system parameters.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push("/admin/settings")} className="w-full" variant="outline">
                Configure Settings
              </Button>
            </CardFooter>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5 text-red-600" />
                Initialize Database
              </CardTitle>
              <CardDescription>Create database tables</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Initialize the Vercel Postgres database tables required for the application.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={initializeDatabase} className="w-full" variant="destructive" disabled={isInitializing}>
                {isInitializing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Initialize Database
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5 text-orange-600" />
                Migrate from Supabase
              </CardTitle>
              <CardDescription>Migrate data from Supabase to Vercel Postgres</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Migrate data from Supabase to Vercel Postgres database.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={migrateFromSupabase} className="w-full" variant="outline" disabled={isMigrating}>
                {isMigrating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Migrate from Supabase
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
