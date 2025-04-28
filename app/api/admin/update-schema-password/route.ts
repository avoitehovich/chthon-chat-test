import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST() {
  try {
    const supabase = createClient()

    // Add password field to users table if it doesn't exist
    const { error } = await supabase.rpc("execute_sql", {
      sql_query: `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name = 'password'
            ) THEN
                ALTER TABLE users ADD COLUMN password TEXT;
            END IF;
        END $$;
      `,
    })

    if (error) {
      console.error("Error updating schema:", error)
      return NextResponse.json({ error: "Failed to update schema" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating schema:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
