import fs from "fs"
import path from "path"

// This is a simple fallback mechanism for when the database is not available
// It stores data in JSON files instead

const DATA_DIR = path.join(process.cwd(), ".data")

// Ensure the data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
} catch (error) {
  console.error("Failed to create data directory:", error)
}

export async function saveData(collection: string, id: string, data: any) {
  try {
    const collectionDir = path.join(DATA_DIR, collection)
    if (!fs.existsSync(collectionDir)) {
      fs.mkdirSync(collectionDir, { recursive: true })
    }

    const filePath = path.join(collectionDir, `${id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error(`Failed to save data for ${collection}/${id}:`, error)
    return false
  }
}

export async function getData(collection: string, id: string) {
  try {
    const filePath = path.join(DATA_DIR, collection, `${id}.json`)
    if (!fs.existsSync(filePath)) {
      return null
    }

    const data = fs.readFileSync(filePath, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error(`Failed to get data for ${collection}/${id}:`, error)
    return null
  }
}

export async function getAllData(collection: string) {
  try {
    const collectionDir = path.join(DATA_DIR, collection)
    if (!fs.existsSync(collectionDir)) {
      return []
    }

    const files = fs.readdirSync(collectionDir)
    const data = []

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(collectionDir, file)
        const fileData = fs.readFileSync(filePath, "utf8")
        data.push(JSON.parse(fileData))
      }
    }

    return data
  } catch (error) {
    console.error(`Failed to get all data for ${collection}:`, error)
    return []
  }
}

export async function deleteData(collection: string, id: string) {
  try {
    const filePath = path.join(DATA_DIR, collection, `${id}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return true
  } catch (error) {
    console.error(`Failed to delete data for ${collection}/${id}:`, error)
    return false
  }
}
