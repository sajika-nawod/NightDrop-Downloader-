POST /api/download
export async function onRequestPost(context) {
    const body = await context.request.json();

    const response = await fetch(
        "https://server.js/download",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }
    );

    return new Response(response.body, {
        status: response.status,
        headers: response.headers
    });
}
