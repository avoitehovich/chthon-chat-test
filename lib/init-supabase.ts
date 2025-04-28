import { getSupabaseServer } from "./supabase"
import fs from "fs"
import path from "path"

export async function initializeSupabase() {
  try {
    console.log("Initializing Supabase database...")

    // Read the SQL schema file
    const schemaPath = path.join(process.cwd(), "supabase", "schema.sql")
    const schema = fs.readFileSync(schemaPath, "utf8")

    // Split the schema into individual statements
    const statements = schema
      .split(";")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0)

    // Get Supabase client
    const supabase = getSupabaseServer()

    // Execute each statement
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc("exec_sql", { sql: statement + ";" })
        if (error) {
          console.error(`Error executing SQL statement: ${error.message}`)
          console.error("Statement:", statement)
        }
      } catch (err) {
        console.error("Error executing SQL statement:", err)
        console.error("Statement:", statement)
      }
    }

    console.log("Supabase database initialization completed")
    return true
  } catch (error) {
    console.error("Failed to initialize Supabase database:", error)
    return false
  }
}

// Function to migrate data from file-based storage to Supabase
export async function migrateDataToSupabase() {
  try {
    console.log("Starting data migration to Supabase...")

    // Get Supabase client
    const supabase = getSupabaseServer()

    // Migrate users
    try {
      const { getAllUsers } = await import("@/utils/user-service")
      const users = await getAllUsers()

      if (users.length > 0) {
        console.log(`Migrating ${users.length} users to Supabase...`)

        for (const user of users) {
          // Check if user already exists
          const { data: existingUser } = await supabase.from("users").select("id").eq("id", user.id).single()

          if (!existingUser) {
            // Convert user to Supabase format
            const supabaseUser = {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              tier: user.tier,
              tier_config: user.tierConfig || null,
              created_at: user.createdAt,
              updated_at: user.updatedAt,
            }

            const { error } = await supabase.from("users").insert(supabaseUser)

            if (error) {
              console.error(`Error migrating user ${user.id}:`, error)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error migrating users:", error)
    }

    // Migrate analytics
    try {
      const { getAnalytics } = await import("@/utils/analytics")
      const analytics = await getAnalytics()

      if (analytics.length > 0) {
        console.log(`Migrating ${analytics.length} analytics records to Supabase...`)

        // Batch insert analytics
        const batchSize = 100
        for (let i = 0; i < analytics.length; i += batchSize) {
          const batch = analytics.slice(i, i + batchSize).map((item) => ({
            user_id: item.userId,
            provider: item.provider,
            type: item.type,
            timestamp: item.timestamp,
            cost: item.cost,
            tokens: item.tokens,
            processing_time: item.processingTime,
            success: item.success,
            error: item.error,
            user_tier: item.userTier,
          }))

          const { error } = await supabase.from("analytics").insert(batch)

          if (error) {
            console.error(`Error migrating analytics batch ${i}:`, error)
          }
        }
      }
    } catch (error) {
      console.error("Error migrating analytics:", error)
    }

    console.log("Data migration to Supabase completed")
    return true
  } catch (error) {
    console.error("Failed to migrate data to Supabase:", error)
    return false
  }
}
