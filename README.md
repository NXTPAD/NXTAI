# NXT AI

NXT AI is the AI workspace for the NXT ecosystem.

## Live AI architecture

The frontend calls `/api/chat`. The Cloudflare Worker keeps the provider API key server-side and streams model output back to the browser.

### Required secret

Set this Worker secret:

```text
OPENAI_API_KEY
```

Never put the API key in `src/`, `App.jsx`, `.env` committed to GitHub, or browser code.

### Deploy

```bash
npm install
npm run build
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

The Worker serves the Vite application and handles `/api/chat`.

## Current capabilities

- NXT AI chat with real model responses
- Streaming responses
- NXT Auto / NXT Reasoning / NXT Fast routing
- Optional web search through the Tools control
- Responsive NXT CLOUD / NXT PAD visual system
- File attachment UI foundation
- NXT ecosystem workspace foundation

## Next backend layers

Authentication, persistent conversation storage, real file uploads/vision, memory, code execution, image generation, voice/realtime, agent tools, and NXT DEX/PAD/CLOUD integrations should be added behind the same Worker API rather than exposing provider credentials to the browser.
