const { execSync } = require("child_process")
const path = require("path")
const fs = require("fs")

// Function to run a command and log output
function runCommand(command) {
  console.log(`Running: ${command}`)
  try {
    const output = execSync(command, { stdio: "inherit" })
    return output
  } catch (error) {
    console.error(`Command failed: ${command}`)
    console.error(error.message)
    return null
  }
}

// Main function
async function main() {
  console.log("Setting up database...")

  // Generate Prisma client
  runCommand("npx prisma generate")

  // Create migrations directory if it doesn't exist
  const migrationsDir = path.join(__dirname, "..", "prisma", "migrations")
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true })
  }

  // Create migration directory for our migration
  const migrationName = "20250429000000_init"
  const migrationDir = path.join(migrationsDir, migrationName)
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true })
  }

  // Deploy migrations
  runCommand("npx prisma migrate deploy")

  console.log("Database setup complete!")
}

main().catch((e) => {
  console.error("Database setup failed:")
  console.error(e)
  process.exit(1)
})
