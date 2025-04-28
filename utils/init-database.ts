import { getSupabaseServer } from "@/lib/supabase"
import fs from "fs"
import path from "path"

export async function initializeDatabase() {
  try {
    console.log("[DB-INIT] Starting database initialization...")

    // Get Supabase client
    const supabase = getSupabaseServer()

    // Read the SQL initialization script
    const sqlPath = path.join(process.cwd(), "supabase", "init.sql")
    console.log("[DB-INIT] Reading SQL file from:", sqlPath)

    let sqlScript: string
    try {
      sqlScript = fs.readFileSync(sqlPath, "utf8")
      console.log("[DB-INIT] SQL file read successfully, length:", sqlScript.length)
    } catch (readError) {
      console.error("[DB-INIT] Error reading SQL file:", readError)
      throw new Error(`Failed to read SQL file: ${readError.message}`)
    }

    // Split the script into individual statements
    const statements = sqlScript
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    console.log("[DB-INIT] Executing", statements.length, "SQL statements")

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      try {
        console.log(`[DB-INIT] Executing statement ${i + 1}/${statements.length}`)
        const { error } = await supabase.rpc("exec_sql", { sql: stmt + ";" })

        if (error) {
          console.error(`[DB-INIT] Error executing statement ${i + 1}:`, error)
          // Continue with other statements even if one fails
        }
      } catch (stmtError) {
        console.error(`[DB-INIT] Exception executing statement ${i + 1}:`, stmtError)
        // Continue with other statements even if one fails
      }
    }

    console.log("[DB-INIT] Database initialization completed")
    return { success: true }
  } catch (error) {
    console.error("[DB-INIT] Database initialization failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
