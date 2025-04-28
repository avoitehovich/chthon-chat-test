"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Shield, Users, Search, AlertCircle, Save, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { tierLimits, type UserTier } from "@/types/user"

// Extended user type with selection state
interface AdminUser {
  id: string
  email: string
  name: string | null
  image: string | null
  tier: UserTier
  createdAt: string
  updatedAt: string
  selected: boolean
}

// Custom tier configuration type
interface TierConfig {
  name: string
  maxTokens: number
  canSelectProvider: boolean
  canUploadImages: boolean
  availableProviders: string[]
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("all")
  const [selectedCount, setSelectedCount] = useState(0)
  const [allSelected, setAllSelected] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [adminKey, setAdminKey] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Tier configuration state
  const [selectedTier, setSelectedTier] = useState<UserTier>("registered")
  const [customTierConfig, setCustomTierConfig] = useState<TierConfig>({
    name: "Custom",
    maxTokens: 1000,
    canSelectProvider: true,
    canUploadImages: true,
    availableProviders: ["openai", "deepseek", "amazon", "google"],
  })

  // Authentication
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
        fetchUsers()
      } else {
        const data = await response.json()
        setAuthError(data.error || "Authentication failed")
      }
    } catch (err) {
      setAuthError("Failed to authenticate. Please try again.")
    }
  }

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${adminKey}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const usersWithSelection = data.users.map((user: any) => ({
          ...user,
          selected: false,
        }))
        setUsers(usersWithSelection)
        setFilteredUsers(usersWithSelection)
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to fetch users",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let result = [...users]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (user) => user.email.toLowerCase().includes(query) || (user.name && user.name.toLowerCase().includes(query)),
      )
    }

    // Apply tier filter
    if (tierFilter !== "all") {
      result = result.filter((user) => user.tier === tierFilter)
    }

    setFilteredUsers(result)
  }, [searchQuery, tierFilter, users])

  // Update selected count
  useEffect(() => {
    const count = filteredUsers.filter((user) => user.selected).length
    setSelectedCount(count)
    setAllSelected(count > 0 && count === filteredUsers.length)
  }, [filteredUsers])

  // Toggle selection for a single user
  const toggleUserSelection = (userId: string) => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, selected: !user.selected } : user)))
  }

  // Toggle selection for all filtered users
  const toggleAllSelection = () => {
    const newValue = !allSelected
    setUsers((prev) =>
      prev.map((user) => {
        // Only toggle selection for users that are currently filtered/visible
        const isFiltered = filteredUsers.some((filtered) => filtered.id === user.id)
        return isFiltered ? { ...user, selected: newValue } : user
      }),
    )
  }

  // Apply tier changes to selected users
  const applyChangesToSelectedUsers = async () => {
    const selectedUsers = users.filter((user) => user.selected)

    if (selectedUsers.length === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user to update.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const tierToApply =
        selectedTier === "custom" ? { ...customTierConfig, tier: "custom" as UserTier } : { tier: selectedTier }

      const response = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({
          userIds: selectedUsers.map((user) => user.id),
          updates: tierToApply,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: `Updated ${data.updatedCount} users successfully.`,
        })

        // Refresh user list
        fetchUsers()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to update users",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Render authentication form
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-blue-600" />
              Admin Authentication
            </CardTitle>
            <CardDescription>Enter your admin key to access user management</CardDescription>
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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="mr-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
              <Users className="mr-2 h-6 w-6" />
              User Management
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={fetchUsers}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage user tiers and permissions</CardDescription>
                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="freemium">Freemium</SelectItem>
                      <SelectItem value="registered">Registered</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <div className="flex items-center">
                                <Checkbox
                                  checked={allSelected}
                                  onCheckedChange={toggleAllSelection}
                                  aria-label="Select all users"
                                />
                              </div>
                            </TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <Checkbox
                                  checked={user.selected}
                                  onCheckedChange={() => toggleUserSelection(user.id)}
                                  aria-label={`Select ${user.name || user.email}`}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {user.image ? (
                                      <img
                                        src={user.image || "/placeholder.svg"}
                                        alt={user.name || user.email}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-gray-500 text-sm font-medium">
                                        {(user.name || user.email).charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium">{user.name || "Unnamed User"}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    user.tier === "premium"
                                      ? "default"
                                      : user.tier === "registered"
                                        ? "secondary"
                                        : user.tier === "custom"
                                          ? "outline"
                                          : "destructive"
                                  }
                                >
                                  {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      {selectedCount > 0
                        ? `${selectedCount} user${selectedCount > 1 ? "s" : ""} selected`
                        : `Showing ${filteredUsers.length} of ${users.length} users`}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-500 dark:text-gray-400">No users found</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tier Configuration */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Apply Changes</CardTitle>
                <CardDescription>Update tier and permissions for selected users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="tier-select">Select Tier</Label>
                    <Select value={selectedTier} onValueChange={setSelectedTier}>
                      <SelectTrigger id="tier-select">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freemium">Freemium</SelectItem>
                        <SelectItem value="registered">Registered</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="custom">Custom Configuration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTier === "custom" ? (
                    <div className="space-y-4 border rounded-md p-4">
                      <h3 className="font-medium">Custom Tier Configuration</h3>

                      <div className="space-y-2">
                        <Label htmlFor="max-tokens">Max Tokens</Label>
                        <Input
                          id="max-tokens"
                          type="number"
                          value={customTierConfig.maxTokens}
                          onChange={(e) =>
                            setCustomTierConfig({
                              ...customTierConfig,
                              maxTokens: Number.parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="can-select-provider">Can Select Provider</Label>
                          <Switch
                            id="can-select-provider"
                            checked={customTierConfig.canSelectProvider}
                            onCheckedChange={(checked) =>
                              setCustomTierConfig({
                                ...customTierConfig,
                                canSelectProvider: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="can-upload-images">Can Upload Images</Label>
                          <Switch
                            id="can-upload-images"
                            checked={customTierConfig.canUploadImages}
                            onCheckedChange={(checked) =>
                              setCustomTierConfig({
                                ...customTierConfig,
                                canUploadImages: checked,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Available Providers</Label>
                        <div className="space-y-2">
                          {["openai", "deepseek", "amazon", "google", "xai"].map((provider) => (
                            <div key={provider} className="flex items-center space-x-2">
                              <Checkbox
                                id={`provider-${provider}`}
                                checked={customTierConfig.availableProviders.includes(provider)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setCustomTierConfig({
                                      ...customTierConfig,
                                      availableProviders: [...customTierConfig.availableProviders, provider],
                                    })
                                  } else {
                                    setCustomTierConfig({
                                      ...customTierConfig,
                                      availableProviders: customTierConfig.availableProviders.filter(
                                        (p) => p !== provider,
                                      ),
                                    })
                                  }
                                }}
                              />
                              <Label htmlFor={`provider-${provider}`} className="text-sm font-medium capitalize">
                                {provider}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Tier Features</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between">
                          <span>Max Tokens:</span>
                          <span className="font-medium">{tierLimits[selectedTier as UserTier].maxTokens}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Can Select Provider:</span>
                          <span className="font-medium">
                            {tierLimits[selectedTier as UserTier].canSelectProvider ? "Yes" : "No"}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Can Upload Images:</span>
                          <span className="font-medium">
                            {tierLimits[selectedTier as UserTier].canUploadImages ? "Yes" : "No"}
                          </span>
                        </li>
                        <li className="flex justify-between">
                          <span>Available Providers:</span>
                          <span className="font-medium">
                            {tierLimits[selectedTier as UserTier].availableProviders.length}
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={applyChangesToSelectedUsers}
                  disabled={selectedCount === 0 || isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Apply to {selectedCount} Selected User{selectedCount !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
