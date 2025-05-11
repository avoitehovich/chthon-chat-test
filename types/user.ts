export type UserTier = "registered" | "premium" | "custom"

export interface User {
  id: string // This can be a UUID string
  email: string
  name: string
  image?: string
  tier: UserTier
  tierConfig?: {
    maxTokens: number
    canSelectProvider: boolean
    canUploadImages: boolean
    availableProviders: string[]
  }
  createdAt: string
  updatedAt: string
}

export const tierLimits = {
  registered: {
    maxTokens: 1000,
    canSelectProvider: true,
    canUploadImages: true,
    availableProviders: ["openai/gpt-4o-mini", "google/gemini-1.5-flash"],
  },
  premium: {
    maxTokens: 1500,
    canSelectProvider: true,
    canUploadImages: true,
    availableProviders: ["openai/gpt-4o-mini", "google/gemini-1.5-flash", "xai/grok-2-latest"],
  },
  // Custom tier will use the tierConfig from the user object
  custom: {
    maxTokens: 1000, // Default values, will be overridden by user's tierConfig
    canSelectProvider: true,
    canUploadImages: true,
    availableProviders: ["openai/gpt-4o-mini", "google/gemini-1.5-flash"],
  },
}

// Helper function to get tier limits for a user, considering custom configurations
export function getUserTierLimits(user: User) {
  if (user.tier === "custom" && user.tierConfig) {
    return user.tierConfig
  }
  return tierLimits[user.tier]
}
