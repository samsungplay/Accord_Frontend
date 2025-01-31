import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import api from "./app/api/api";

async function isAuthenticated(
  request: NextRequest,
): Promise<{ valid: boolean; newAccessToken: string | null }> {
  const accessToken = request.cookies.get("accord_access_token");
  const refreshToken = request.cookies.get("accord_refresh_token");

  if (accessToken) {
    const res = await api.get("/authentication/authenticate", {
      headers: {
        Authorization: "Bearer " + accessToken.value,
      },
      validateStatus: () => true,
    });
    if (res.status === 200) {
      // console.log(res.headers)
      return {
        valid: true,
        newAccessToken: null,
      };
    } else {
      if (res.data?.error === "invalid token" && refreshToken) {
        const resp = await api.get("/authentication/authenticate", {
          headers: {
            "Refresh-Token": refreshToken.value,
          },
          validateStatus: () => true,
        });

        if (resp.status === 201 && resp.data["access_token"]) {
          const newAccessToken = resp.data["access_token"];

          const refreshedResp = await api.get("/authentication/authenticate", {
            headers: {
              Authorization: "Bearer " + newAccessToken,
            },
            validateStatus: () => true,
          });

          if (refreshedResp.status === 200) {
            return {
              valid: true,
              newAccessToken: newAccessToken,
            };
          }
        }
      }
    }
  }
  return {
    valid: false,
    newAccessToken: null,
  };
}

export async function middleware(request: NextRequest) {
  //verify authentication

  const authentication = await isAuthenticated(request);

  if (!request.nextUrl.pathname.includes("authentication")) {
    if (!authentication.valid) {
      return NextResponse.redirect(new URL("/authentication", request.url));
    } else if (authentication.newAccessToken) {
      const response = NextResponse.next();
      response.cookies.set(
        "accord_access_token",
        authentication.newAccessToken,
      );
      return response;
    }
  } else {
    //for authentication urls
    if (authentication.valid) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
