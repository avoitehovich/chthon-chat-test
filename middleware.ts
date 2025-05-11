import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const publicPaths = ["/", "/auth/signin", "/auth/error"]
  const isPublicPath = publicPaths.some((pp) => path === pp || path.startsWith(`${pp}/`))

  // Check if the path is for API routes
  const isApiPath = path.startsWith("/api/")

  // If it's a public path or API route, allow the request
  if (isPublicPath || isApiPath) {
    return NextResponse.next()
  }

  // Get the token
  const token = await getToken({ req: request })

  // If there's no token and the path is not public, redirect to the landing page
  if (!token) {
    const url = new URL("/", request.url)
    return NextResponse.redirect(url)
  }

  // Allow the request
  return NextResponse.next()
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)",
  ],
}
