import { redirect } from "next/navigation"

export async function GET() {
  // Redirect API error routes to the proper error page
  redirect("/auth/error")
}
