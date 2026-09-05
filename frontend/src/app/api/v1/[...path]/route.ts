import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // This is a same-origin proxy. Reflecting arbitrary origins is unsafe when
  // authenticated cookies are forwarded to the backend.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204 });
  }

  const pathSegments = (await Promise.resolve(params)).path;
  const path = pathSegments.join("/");
  const searchParams = request.nextUrl.search;
  
  // Target URL (use env var or fallback to correct production backend)
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE 
    ? process.env.NEXT_PUBLIC_API_BASE.replace(/\/v1$/, "")
    : "https://backend-sowjanya-designs-projects.vercel.app/api";
  const targetUrl = `${baseUrl}/v1/${path}${searchParams}`;
  
  // Copy headers
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });
  
  // The backend treats this as an internal server-to-server request. Do not
  // forward a caller-controlled Origin header.
  headers.delete("origin");
  
  // Also pass the Vercel SSO nonce if we have it
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  try {
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? await request.text() : undefined,
      redirect: "manual",
    });

    // Copy response headers
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!lowerKey.startsWith("access-control-") && lowerKey !== "content-encoding" && lowerKey !== "content-length" && lowerKey !== "set-cookie") {
        responseHeaders.set(key, value);
      }
    });

    // Properly forward Set-Cookie headers without joining them by commas
    const setCookies = backendResponse.headers.getSetCookie();
    setCookies.forEach((cookie) => {
      responseHeaders.append("Set-Cookie", cookie);
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown proxy error";
    return NextResponse.json(
      { success: false, message: `Proxy error: ${message}` },
      { status: 500 },
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
