const { execSync } = require("child_process")

async function main() {
  try {
    console.log("Pushing schema to database...")
    execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" })
    console.log("Schema pushed successfully!")
  } catch (error) {
    console.error("Error pushing schema:", error)
    process.exit(1)
  }
}

main()
