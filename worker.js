const MODEL_MAP = {
  "nxt-auto": "gpt-5.6-luna",
  "nxt-reasoning": "gpt-5.6-sol",
  "nxt-fast": "gpt-5.6-luna"
};

const headers = (origin = "*") => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "Connection": "keep-alive"
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    if (url.pathname === "/api/chat") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

      if (!env.OPENAI_API_KEY) {
        return new Response("NXT AI is not configured. Add OPENAI_API_KEY to the Worker secrets.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": origin }
        });
      }

      try {
        const body = await request.json();
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const model = MODEL_MAP[body.model] || MODEL_MAP["nxt-auto"];

        const payload = {
          model,
          instructions: "You are NXT AI, the official AI assistant for the NXT ecosystem. Be helpful, accurate, direct, and transparent about limitations. Never claim an integration or tool is active unless it actually is.",
          input: messages.slice(-30).map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: String(message.content || "")
          })),
          stream: true
        };

        if (body.useWeb === true) payload.tools = [{ type: "web_search" }];

        const upstream = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.OPENAI_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!upstream.ok) {
          const detail = await upstream.text();
          return new Response("NXT AI provider error: " + detail, {
            status: upstream.status,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": origin }
          });
        }

        return new Response(upstream.body, { headers: headers(origin) });
      } catch (error) {
        return new Response("NXT AI request error: " + error.message, {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": origin }
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};