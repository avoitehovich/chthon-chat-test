import { prisma } from "@/lib/db"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

export async function migrateFromSupabase() {
  try {
    console.log("[MIGRATION] Starting migration from Supabase to Vercel Postgres")

    // Check if Supabase environment variables are available
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[MIGRATION] Missing Supabase environment variables")
      return { success: false, error: "Missing Supabase environment variables" }
    }

    // Initialize Supabase client
    const supabase = createClient<Database>(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Step 1: Migrate users
    console.log("[MIGRATION] Migrating users")
    const { data: users, error: usersError } = await supabase.from("users").select("*")

    if (usersError) {
      console.error("[MIGRATION] Error fetching users from Supabase:", usersError)
      return { success: false, error: `Error fetching users: ${usersError.message}` }
    }

    if (users && users.length > 0) {
      console.log(`[MIGRATION] Found ${users.length} users to migrate`)

      // Create users in Vercel Postgres
      for (const user of users) {
        try {
          await prisma.user.upsert({
            where: { id: user.id },
            update: {
              email: user.email,
              name: user.name,
              image: user.image,
              tier: user.tier,
              tierConfig: user.tier_config,
              updatedAt: new Date(user.updated_at),
            },
            create: {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              tier: user.tier,
              tierConfig: user.tier_config,
              createdAt: new Date(user.created_at),
              updatedAt: new Date(user.updated_at),
            },
          })
        } catch (error) {
          console.error(`[MIGRATION] Error migrating user ${user.id}:`, error)
        }
      }

      console.log("[MIGRATION] Users migration completed")
    } else {
      console.log("[MIGRATION] No users found to migrate")
    }

    // Step 2: Migrate analytics
    console.log("[MIGRATION] Migrating analytics")
    const { data: analytics, error: analyticsError } = await supabase.from("analytics").select("*")

    if (analyticsError) {
      console.error("[MIGRATION] Error fetching analytics from Supabase:", analyticsError)
      return { success: false, error: `Error fetching analytics: ${analyticsError.message}` }
    }

    if (analytics && analytics.length > 0) {
      console.log(`[MIGRATION] Found ${analytics.length} analytics records to migrate`)

      // Process in batches to avoid memory issues
      const batchSize = 100
      for (let i = 0; i < analytics.length; i += batchSize) {
        const batch = analytics.slice(i, i + batchSize)

        try {
          await prisma.$transaction(
            batch.map((record) =>
              prisma.analytics.create({
                data: {
                  userId: record.user_id,
                  provider: record.provider,
                  type: record.type,
                  timestamp: new Date(record.timestamp),
                  cost: record.cost,
                  tokens: record.tokens,
                  processingTime: record.processing_time,
                  success: record.success,
                  error: record.error,
                  userTier: record.user_tier,
                  providerDetails: record.provider_details,
                  responseTime: record.response_time,
                  requestSize: record.request_size,
                  responseSize: record.response_size,
                },
              }),
            ),
          )
          console.log(
            `[MIGRATION] Migrated analytics batch ${i / batchSize + 1}/${Math.ceil(analytics.length / batchSize)}`,
          )
        } catch (error) {
          console.error(`[MIGRATION] Error migrating analytics batch ${i / batchSize + 1}:`, error)
        }
      }

      console.log("[MIGRATION] Analytics migration completed")
    } else {
      console.log("[MIGRATION] No analytics found to migrate")
    }

    // Step 3: Migrate chat sessions
    console.log("[MIGRATION] Migrating chat sessions")
    const { data: sessions, error: sessionsError } = await supabase.from("chat_sessions").select("*")

    if (sessionsError) {
      console.error("[MIGRATION] Error fetching chat sessions from Supabase:", sessionsError)
      return { success: false, error: `Error fetching chat sessions: ${sessionsError.message}` }
    }

    if (sessions && sessions.length > 0) {
      console.log(`[MIGRATION] Found ${sessions.length} chat sessions to migrate`)

      for (const session of sessions) {
        try {
          await prisma.chatSession.upsert({
            where: { id: session.id },
            update: {
              name: session.name,
              lastUpdated: new Date(session.last_updated),
              createdAt: new Date(session.created_at),
            },
            create: {
              id: session.id,
              userId: session.user_id,
              name: session.name,
              lastUpdated: new Date(session.last_updated),
              createdAt: new Date(session.created_at),
            },
          })

          // Fetch and migrate messages for this session
          const { data: messages, error: messagesError } = await supabase
            .from("messages")
            .select("*")
            .eq("session_id", session.id)

          if (messagesError) {
            console.error(`[MIGRATION] Error fetching messages for session ${session.id}:`, messagesError)
            continue
          }

          if (messages && messages.length > 0) {
            console.log(`[MIGRATION] Migrating ${messages.length} messages for session ${session.id}`)

            for (const message of messages) {
              try {
                await prisma.message.upsert({
                  where: { id: message.id },
                  update: {
                    role: message.role,
                    content: message.content,
                    imageUrl: message.image_url,
                    timestamp: new Date(message.timestamp),
                  },
                  create: {
                    id: message.id,
                    sessionId: message.session_id,
                    role: message.role,
                    content: message.content,
                    imageUrl: message.image_url,
                    timestamp: new Date(message.timestamp),
                  },
                })
              } catch (error) {
                console.error(`[MIGRATION] Error migrating message ${message.id}:`, error)
              }
            }
          }
        } catch (error) {
          console.error(`[MIGRATION] Error migrating chat session ${session.id}:`, error)
        }
      }

      console.log("[MIGRATION] Chat sessions and messages migration completed")
    } else {
      console.log("[MIGRATION] No chat sessions found to migrate")
    }

    // Step 4: Migrate admin settings
    console.log("[MIGRATION] Migrating admin settings")
    const { data: adminSettings, error: adminSettingsError } = await supabase.from("admin_settings").select("*")

    if (adminSettingsError) {
      console.error("[MIGRATION] Error fetching admin settings from Supabase:", adminSettingsError)
      return { success: false, error: `Error fetching admin settings: ${adminSettingsError.message}` }
    }

    if (adminSettings && adminSettings.length > 0) {
      console.log(`[MIGRATION] Found ${adminSettings.length} admin settings to migrate`)

      for (const setting of adminSettings) {
        try {
          await prisma.adminSettings.upsert({
            where: { id: setting.id },
            update: {
              settings: setting.settings,
              updatedAt: new Date(setting.updated_at),
              updatedBy: setting.updated_by,
            },
            create: {
              id: setting.id,
              settings: setting.settings,
              updatedAt: new Date(setting.updated_at),
              updatedBy: setting.updated_by,
            },
          })
        } catch (error) {
          console.error(`[MIGRATION] Error migrating admin setting ${setting.id}:`, error)
        }
      }

      console.log("[MIGRATION] Admin settings migration completed")
    } else {
      console.log("[MIGRATION] No admin settings found to migrate")
    }

    console.log("[MIGRATION] Migration from Supabase to Vercel Postgres completed successfully")
    return { success: true }
  } catch (error) {
    console.error("[MIGRATION] Migration failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during migration",
    }
  }
}
