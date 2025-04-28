import type { DefaultSession } from "next-auth"
import type { UserTier } from "./user"

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string
      tier?: UserTier
    } & DefaultSession["user"]
  }
}
