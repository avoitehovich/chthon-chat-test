import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // This middleware doesn't do anything with the database
  // It's just here to ensure the app can start even if the database is not available
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/db-test (API routes that test database connection)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/db-test|_next/static|_next/image|favicon.ico).*)",
  ],
}
