"use client"

import { useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { AlertCircle } from "lucide-react"

interface AnalyticsData {
  provider: string
  type: "text" | "image"
  timestamp: string
  cost: number
  tokens: number
  processingTime: number
  success: boolean
  error: string | null
  responseTime?: number
  requestSize?: number
  responseSize?: number
  providerDetails?: Record<
    string,
    { promptTokens?: number; completionTokens?: number; totalTokens?: number; cost: number }
  >
}

interface AnalyticsSummary {
  totalCost: number
  totalTokens: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  providerStats: Record<string, { requests: number; cost: number; tokens: number; successRate: number }>
  typeStats: {
    text: { requests: number; cost: number; tokens: number }
    image: { requests: number; cost: number; tokens: number }
  }
  dailyUsage: Record<string, { requests: number; cost: number; tokens: number }>
  providerDetailsSummary?: Record<string, { requests: number; cost: number; tokens: number }>
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

// Update the ProviderDetailsCard component to ensure it's correctly displaying data

// Find the ProviderDetailsCard component (around line 70-130) and update it to:

const ProviderDetailsCard = ({ providerDetailsSummary }) => {
  if (!providerDetailsSummary || Object.keys(providerDetailsSummary).length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Provider Details</h2>
        <p className="text-center text-gray-500 dark:text-gray-400">No provider details available.</p>
      </div>
    )
  }

  console.log("Provider details summary:", providerDetailsSummary)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Provider Details</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Provider
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Requests
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Cost
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Tokens
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Avg. Cost/Request
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Avg. Cost/1K Tokens
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(providerDetailsSummary).map(([provider, details]) => (
              <tr key={provider}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {provider}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {details.requests}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${details.cost.toFixed(6)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {details.tokens.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${details.requests > 0 ? (details.cost / details.requests).toFixed(6) : "0.000000"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${details.tokens > 0 ? ((details.cost / details.tokens) * 1000).toFixed(6) : "0.000000"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Add this component to display performance metrics
const PerformanceMetricsCard = ({ analytics }) => {
  // Calculate average response time
  const responseTimes = analytics
    .filter((item) => item.responseTime && item.responseTime > 0)
    .map((item) => item.responseTime)

  const avgResponseTime =
    responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0

  // Calculate average request and response sizes
  const requestSizes = analytics
    .filter((item) => item.requestSize && item.requestSize > 0)
    .map((item) => item.requestSize)

  const responseSizes = analytics
    .filter((item) => item.responseSize && item.responseSize > 0)
    .map((item) => item.responseSize)

  const avgRequestSize =
    requestSizes.length > 0 ? requestSizes.reduce((sum, size) => sum + size, 0) / requestSizes.length : 0

  const avgResponseSize =
    responseSizes.length > 0 ? responseSizes.reduce((sum, size) => sum + size, 0) / responseSizes.length : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Performance Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-2">Average Response Time</h3>
          <p className="text-2xl font-bold">{(avgResponseTime / 1000).toFixed(2)}s</p>
          <p className="text-xs text-gray-500 mt-1">Time to receive API response</p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-2">Average Request Size</h3>
          <p className="text-2xl font-bold">{(avgRequestSize / 1024).toFixed(2)} KB</p>
          <p className="text-xs text-gray-500 mt-1">Size of request payload</p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium mb-2">Average Response Size</h3>
          <p className="text-2xl font-bold">{(avgResponseSize / 1024).toFixed(2)} KB</p>
          <p className="text-xs text-gray-500 mt-1">Size of response payload</p>
        </div>
      </div>
    </div>
  )
}

// Add a new component to display detailed token usage
// Add this after the PerformanceMetricsCard component (around line 100)

// Also update the TokenUsageDetailsCard component to better extract token data:

const TokenUsageDetailsCard = ({ analytics }) => {
  // Extract token usage data from provider details
  const tokenData = analytics
    .filter(
      (item) =>
        item.providerDetails &&
        Object.values(item.providerDetails).some(
          (details) =>
            details.promptTokens !== undefined ||
            details.completionTokens !== undefined ||
            details.totalTokens !== undefined ||
            details.tokens !== undefined,
        ),
    )
    .slice(0, 20) // Take the 20 most recent entries with token data

  if (tokenData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Detailed Token Usage</h2>
        <p className="text-center text-gray-500 dark:text-gray-400">No detailed token data available.</p>
      </div>
    )
  }

  console.log("Token data:", tokenData)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Detailed Token Usage</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Timestamp
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Provider
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Prompt Tokens
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Completion Tokens
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Total Tokens
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Cost
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {tokenData.map((item, index) => {
              // Get the first provider with token data
              const providerName = Object.keys(item.providerDetails)[0]
              const details = item.providerDetails[providerName]

              return (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {providerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {details.promptTokens || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {details.completionTokens || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {details.totalTokens ||
                      (details.promptTokens || 0) + (details.completionTokens || 0) ||
                      details.tokens ||
                      0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${details.cost.toFixed(6)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AdminAnalytics() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminKey, setAdminKey] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [rawData, setRawData] = useState<AnalyticsData[]>([])

  const authenticate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminKey }),
      })

      if (response.ok) {
        setIsAuthenticated(true)
        fetchAnalytics()
      } else {
        const data = await response.json()
        setError(data.error || "Authentication failed")
      }
    } catch (err) {
      setError("Failed to authenticate. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/analytics", {
        headers: {
          Authorization: `Bearer ${adminKey}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.summary)
        setRawData(data.rawData)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to fetch analytics")
      }
    } catch (err) {
      setError("Failed to fetch analytics. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Format data for charts
  const getProviderChartData = () => {
    if (!analytics) return []

    return Object.entries(analytics.providerStats).map(([provider, stats]) => ({
      name: provider,
      requests: stats.requests,
      cost: Number.parseFloat(stats.cost.toFixed(4)),
      tokens: stats.tokens,
      successRate: Number.parseFloat(stats.successRate.toFixed(2)),
    }))
  }

  const getTypeChartData = () => {
    if (!analytics) return []

    return [
      {
        name: "Text",
        value: analytics.typeStats.text.requests,
        cost: analytics.typeStats.text.cost,
        tokens: analytics.typeStats.text.tokens,
      },
      {
        name: "Image",
        value: analytics.typeStats.image.requests,
        cost: analytics.typeStats.image.cost,
        tokens: analytics.typeStats.image.tokens,
      },
    ]
  }

  const getDailyUsageChartData = () => {
    if (!analytics) return []

    return Object.entries(analytics.dailyUsage)
      .map(([date, stats]) => ({
        date,
        requests: stats.requests,
        cost: Number.parseFloat(stats.cost.toFixed(4)),
        tokens: stats.tokens,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Authentication</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Key
              </label>
              <input
                type="password"
                id="adminKey"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter admin key"
              />
            </div>

            <button
              onClick={authenticate}
              disabled={isLoading || !adminKey}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "Authenticate"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Analytics Dashboard</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : analytics ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Requests</h2>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.totalRequests}</p>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-green-500 dark:text-green-400">
                    {analytics.successRate.toFixed(1)}% Success Rate
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Cost</h2>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${analytics.totalCost.toFixed(4)}</p>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Across all providers</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Tokens</h2>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {analytics.totalTokens.toLocaleString()}
                </p>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Used across all requests</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Failed Requests</h2>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.failedRequests}</p>
                <div className="mt-2 flex items-center text-sm">
                  <span className="text-red-500 dark:text-red-400">
                    {analytics.failedRequests > 0
                      ? ((analytics.failedRequests / analytics.totalRequests) * 100).toFixed(1) + "%"
                      : "0%"}{" "}
                    Failure Rate
                  </span>
                </div>
              </div>
            </div>

            {/* Provider Stats Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Provider Statistics</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getProviderChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="requests" name="Requests" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="cost" name="Cost ($)" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Request Type Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Request Type Distribution</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getTypeChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {getTypeChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} requests`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Success Rate by Provider</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getProviderChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, "Success Rate"]} />
                      <Bar dataKey="successRate" name="Success Rate (%)" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Daily Usage Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Daily Usage</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getDailyUsageChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="requests" name="Requests" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="cost" name="Cost ($)" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Provider Details */}
            {analytics.providerDetailsSummary && (
              <ProviderDetailsCard providerDetailsSummary={analytics.providerDetailsSummary} />
            )}

            {/* Performance Metrics */}
            <PerformanceMetricsCard analytics={rawData} />

            {/* Token Usage Details */}
            <TokenUsageDetailsCard analytics={rawData} />

            {/* Raw Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Recent Requests</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Timestamp
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Provider
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Cost
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Tokens
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {rawData.slice(0, 10).map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(item.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.provider}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          ${item.cost.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.tokens}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.success ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}
                          >
                            {item.success ? "Success" : "Failed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-center text-gray-500 dark:text-gray-400">No analytics data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
