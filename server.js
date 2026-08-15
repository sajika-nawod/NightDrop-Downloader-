 export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API requests
    if (url.pathname.startsWith("/api/")) {
      // If you later have a separate Node.js backend,
      // set BACKEND_URL in Cloudflare environment variables.
      if (!env.BACKEND_URL) {
        return Response.json(
          {
            error: "Backend is not configured.",
            message:
              "The frontend is hosted on Cloudflare Workers, but the Node.js/yt-dlp backend is required for downloading."
          },
          { status: 503 }
        );
      }

      const backendUrl = new URL(
        url.pathname + url.search,
        env.BACKEND_URL
      );

      const headers = new Headers(request.headers);
      headers.set("X-Forwarded-Host", url.host);

      return fetch(backendUrl.toString(), {
        method: request.method,
        headers,
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : request.body
      });
    }

    // Serve files from public/
    return env.ASSETS.fetch(request);
  }
};
