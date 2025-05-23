import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Check if the request is for the API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Add security headers
    const headers = new Headers(request.headers)
    headers.set("x-api-key", process.env.GROQ_API_KEY || "")

    // You can also validate the request here
    return NextResponse.next({
      request: {
        headers,
      },
    })
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: "/api/:path*",
}
