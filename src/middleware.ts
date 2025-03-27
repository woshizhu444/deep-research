import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isEqual } from "radash";

const accessPassword = process.env.ACCESS_PASSWORD || "";

const apiRoutes = ["/api/ai/"];

// Limit the middleware to paths starting with `/api/`
export const config = {
  matcher: "/api/:path*",
};

export function middleware(request: NextRequest) {
  for (const apiRoute of apiRoutes) {
    if (request.nextUrl.pathname.startsWith(apiRoute)) {
      const authorization = request.headers.get("x-goog-api-key");
      if (isEqual(authorization, null) || authorization !== accessPassword) {
        return NextResponse.json(
          {
            error: {
              code: 403,
              message: "No permissions",
              status: "FORBIDDEN",
            },
          },
          { status: 403 }
        );
      }
    }
  }
  return NextResponse.next();
}
