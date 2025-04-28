import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase"
import fs from "fs"
import path from "path"

export async function POST(req: Request) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract the token
    const token = authHeader.substring(7)

    // Verify the token matches the admin key
    if (token !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "Invalid authorization token" }, { status: 401 })
    }

    // Initialize Supabase client
    const supabase = getSupabaseServer()

    // Read the SQL schema update file
    const schemaPath = path.join(process.cwd(), "supabase", "schema-update.sql")
    const schema = fs.readFileSync(schemaPath, "utf8")

    // Split the schema into individual statements
    const statements = schema
      .split(";")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0)

    // Execute each statement
    const results = []
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc("exec_sql", { sql: statement + ";" })
        if (error) {
          console.error(`Error executing SQL statement: ${error.message}`)
          console.error("Statement:", statement)
          results.push({ success: false, error: error.message, statement })
        } else {
          results.push({ success: true, statement })
        }
      } catch (err) {
        console.error("Error executing SQL statement:", err)
        console.error("Statement:", statement)
        results.push({ success: false, error: String(err), statement })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Schema update completed",
      results,
    })
  } catch (error) {
    console.error("Failed to update schema:", error)
    return NextResponse.json(
      {
        error: "Failed to update schema",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
