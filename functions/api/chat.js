const MODEL_MAP = {
  "nxt-auto": "gpt-5.6-luna",
  "nxt-reasoning": "gpt-5.6-sol",
  "nxt-fast": "gpt-5.6-luna"
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive"
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin") || "*";

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST, OPTIONS" } });
  }

  if (!env.OPENAI_API_KEY) {
    return new Response("NXT AI is not configured yet. Add OPENAI_API_KEY to the Cloudflare Pages/Workers environment variables.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": origin }
    });
  }

  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const model = MODEL_MAP[body.model] || MODEL_MAP["nxt-auto"];
    const useWeb = body.useWeb === true;

    const input = messages.slice(-30).map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content || "")
    }));

    const payload = {
      model,
      instructions: "You are NXT AI, the official AI assistant for the NXT ecosystem. Be helpful, accurate, concise when appropriate, and transparent about limitations. Do not claim a tool or integration is active unless it actually is.",
      input,
      stream: true
    };

    if (useWeb) payload.tools = [{ type: "web_search" }];

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return new Response("NXT AI provider error: " + errorText, {
        status: upstream.status,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": origin }
      });
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const chunks = buffer.split("\n\n");
            buffer = chunks.pop() || "";

            for (const chunk of chunks) {
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (!data || data === "[DONE]") continue;

                try {
                  const event = JSON.parse(data);
                  if (event.type === "response.output_text.delta" && event.delta) {
                    controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "delta", text: event.delta }) + "\n\n"));
                  }
                  if (event.type === "response.completed") {
                    controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "done", responseId: event.response?.id || null }) + "\n\n"));
                  }
                } catch {}
              }
            }
          }
          controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "done" }) + "\n\n"));
          controller.close();
        } catch (error) {
          controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "error", message: error.message }) + "\n\n"));
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: corsHeaders(origin) });
  } catch (error) {
    return new Response("NXT AI request error: " + error.message, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": origin }
    });
  }
}