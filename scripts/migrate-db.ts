import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

async function main() {
  try {
    console.log("Running database migrations...")

    // Run Prisma migrations
    const { stdout, stderr } = await execAsync("npx prisma migrate deploy")

    if (stderr) {
      console.error("Migration stderr:", stderr)
    }

    console.log("Migration stdout:", stdout)
    console.log("Database migrations completed successfully")

    // Initialize the database with default data
    console.log("Initializing database...")

    const response = await fetch(`${process.env.VERCEL_URL || "http://localhost:3000"}/api/admin/init-database`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ADMIN_KEY}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to initialize database: ${errorData.error || response.statusText}`)
    }

    console.log("Database initialization completed successfully")
  } catch (error) {
    console.error("Migration error:", error)
    process.exit(1)
  }
}

main()
