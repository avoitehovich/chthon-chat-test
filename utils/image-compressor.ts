/**
 * Utility for compressing images client-side before upload
 */

// Maximum file size in bytes (2MB)
export const MAX_FILE_SIZE = 2 * 1024 * 1024

/**
 * Compresses an image file to ensure it's under the maximum file size
 * @param file The image file to compress
 * @param maxSizeBytes Maximum file size in bytes
 * @param quality Initial quality setting (0-1)
 * @returns Promise resolving to a compressed File object
 */
export async function compressImage(file: File, maxSizeBytes: number = MAX_FILE_SIZE, quality = 0.8): Promise<File> {
  // If file is already smaller than max size, return it as is
  if (file.size <= maxSizeBytes) {
    console.log("[IMAGE-COMPRESSOR] Image already under size limit, skipping compression")
    return file
  }

  console.log(
    `[IMAGE-COMPRESSOR] Compressing image from ${(file.size / 1024).toFixed(2)}KB to target < ${(maxSizeBytes / 1024).toFixed(2)}KB`,
  )

  return new Promise((resolve, reject) => {
    // Create a FileReader to read the file
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      // Create an image to get the dimensions
      const img = new Image()
      img.src = event.target?.result as string

      img.onload = () => {
        // Create a canvas element
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Calculate new dimensions while maintaining aspect ratio
        // For very large images, we'll also reduce dimensions
        const MAX_DIMENSION = 1600
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }

        canvas.width = width
        canvas.height = height

        // Draw image on canvas
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("[IMAGE-COMPRESSOR] Could not get canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Try to compress with decreasing quality until file size is under limit
        const compressWithQuality = (currentQuality: number) => {
          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("[IMAGE-COMPRESSOR] Could not create blob from canvas"))
                return
              }

              console.log(
                `[IMAGE-COMPRESSOR] Compressed with quality ${currentQuality.toFixed(2)}, size: ${(blob.size / 1024).toFixed(2)}KB`,
              )

              // If the blob is still too large and quality can be reduced further
              if (blob.size > maxSizeBytes && currentQuality > 0.1) {
                // Reduce quality and try again
                compressWithQuality(currentQuality - 0.1)
              } else {
                // Create a new file from the blob
                const newFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                })

                console.log(
                  `[IMAGE-COMPRESSOR] Final size: ${(newFile.size / 1024).toFixed(2)}KB (${Math.round((1 - newFile.size / file.size) * 100)}% reduction)`,
                )
                resolve(newFile)
              }
            },
            file.type,
            currentQuality,
          )
        }

        // Start compression with initial quality
        compressWithQuality(quality)
      }

      img.onerror = () => {
        reject(new Error("[IMAGE-COMPRESSOR] Failed to load image"))
      }
    }

    reader.onerror = () => {
      reject(new Error("[IMAGE-COMPRESSOR] Failed to read file"))
    }
  })
}
