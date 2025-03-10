import DOMPurify from "dompurify"

export function parseHTML(html: string): string {
  // First, clean the HTML to remove any potentially malicious content
  const cleanHtml = DOMPurify.sanitize(html)

  // Then convert HTML to a more readable format
  return cleanHtml
    .replace(/<h2>(.*?)<\/h2>/g, "\n\n$1\n")
    .replace(/<strong>(.*?)<\/strong>/g, "$1")
    .replace(/<ul>/g, "\n")
    .replace(/<\/ul>/g, "")
    .replace(/<li>/g, "• ")
    .replace(/<\/li>/g, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

