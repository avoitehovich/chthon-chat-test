"use client"

interface MessageContentProps {
  content: string
}

export function MessageContent({ content }: MessageContentProps) {
  // Split the content by newlines to handle bullet points and paragraphs
  const lines = content.split("\n")

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        // Check if line is a bullet point
        if (line.trim().startsWith("•")) {
          return (
            <div key={index} className="flex">
              <span className="mr-2">•</span>
              <span>{line.trim().substring(1).trim()}</span>
            </div>
          )
        }
        // Regular text
        return line.trim() ? <p key={index}>{line}</p> : <br key={index} />
      })}
    </div>
  )
}

