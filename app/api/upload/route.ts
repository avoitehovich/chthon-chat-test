import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

// Reduce maximum file size to 2MB (from 5MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024

export async function POST(req: Request) {
  try {
    console.log("[UPLOAD] Starting file upload process")

    // Parse form data with error handling
    let formData
    try {
      formData = await req.formData()
      console.log("[UPLOAD] Form data parsed successfully")
    } catch (formError) {
      console.error("[UPLOAD] Error parsing form data:", formError)
      return NextResponse.json(
        {
          error: "Failed to parse form data. Please try again.",
        },
        { status: 400 },
      )
    }

    const file = formData.get("file") as File | null

    if (!file) {
      console.error("[UPLOAD] No file provided in request")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[UPLOAD] File received:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`,
    })

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error("[UPLOAD] File size exceeds limit:", file.size)
      return NextResponse.json(
        {
          error: "File size exceeds 2MB limit. Please compress your image or use a smaller one.",
          code: "FILE_TOO_LARGE",
        },
        { status: 413 },
      )
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      console.error("[UPLOAD] Invalid file type:", file.type)
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Generate a unique filename with timestamp and random string
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 10)
    const fileExtension = file.name.split(".").pop()
    const filename = `${timestamp}-${randomString}.${fileExtension}`

    console.log("[UPLOAD] Generated filename:", filename)

    try {
      // Check if BLOB_READ_WRITE_TOKEN is available
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error("[UPLOAD] Missing BLOB_READ_WRITE_TOKEN environment variable")
        return NextResponse.json(
          {
            error: "Server configuration error: Missing blob storage token",
          },
          { status: 500 },
        )
      }

      // Upload to Vercel Blob Storage
      console.log("[UPLOAD] Uploading to Vercel Blob Storage...")
      const blob = await put(filename, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN as string,
        storeName: "chthon-blob",
      })

      console.log("[UPLOAD] File uploaded successfully:", blob.url)

      // Return the URL of the uploaded file
      return NextResponse.json({
        url: blob.url,
        success: true,
      })
    } catch (blobError) {
      console.error("[UPLOAD] Vercel Blob upload error:", blobError)

      // Provide more detailed error information
      let errorMessage = "Failed to upload to Vercel Blob"
      if (blobError instanceof Error) {
        errorMessage += `: ${blobError.message}`
        console.error("[UPLOAD] Error stack:", blobError.stack)
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  } catch (error) {
    console.error("[UPLOAD] Unhandled error in upload route:", error)

    let errorMessage = "Failed to upload file"
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`
      console.error("[UPLOAD] Error stack:", error.stack)
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
