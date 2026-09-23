import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "ladybird_session";
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/demo-accounts", "/api/school/public"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/_next") || pathname.startsWith("/icons")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return redirectToLogin(req);
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|service-worker.js).*)"],
};
