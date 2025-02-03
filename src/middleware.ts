import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  //verify authentication

  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/authentication", request.url));
  }
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
