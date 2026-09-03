import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const origin = request.headers.get("Origin") || "*";

  // Handle CORS preflight directly without bothering the backend
  if (request.method === "OPTIONS") {
    const preflightHeaders = new Headers();
    preflightHeaders.set("Access-Control-Allow-Origin", origin);
    preflightHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    preflightHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    preflightHeaders.set("Access-Control-Allow-Credentials", "true");
    preflightHeaders.set("Access-Control-Max-Age", "86400"); // 24 hours
    
    return new NextResponse(null, {
      status: 204, // Success status code required by CORS spec
      headers: preflightHeaders,
    });
  }

  const pathSegments = (await Promise.resolve(params)).path;
  const path = pathSegments.join("/");
  const searchParams = request.nextUrl.search;
  
  // Target URL
  const targetUrl = `https://backend-pearl-seven-77.vercel.app/api/v1/${path}${searchParams}`;
  
  // Copy headers
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });
  
  // Trick the backend's CORS check
  headers.set("Origin", "https://placeonix-frontend-v2.vercel.app");
  
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
      if (!lowerKey.startsWith("access-control-")) {
        responseHeaders.set(key, value);
      }
    });

    // Inject our permissive CORS headers
    responseHeaders.set("Access-Control-Allow-Origin", origin);
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    responseHeaders.set("Access-Control-Allow-Credentials", "true");

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: "Proxy Error: " + err.message }, { status: 500 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
