# Hosting on Render

Deploys the Express tier (`server/`) to Render's free plan. No credit card.

That tier covers authentication, products, inventory, invoices, alerts, and the
admin API.

## Prerequisites

- A Render account
- **Your own Firebase project**, with Firestore and Authentication enabled.
  Create one rather than reusing this repository's project, so each deploy is
  isolated.

## Deploy

1. Push the branch, then in Render choose **New > Blueprint** and select the
   repository. Render reads `render.yaml` from the repo root.
2. Render prompts for the two values marked `sync: false`. Leave
   `PYTHON_AI_URL` empty.
3. Add the Firebase credential as a **Secret File**: Dashboard > Environment >
   Secret Files > Add, filename `service-account.json`, then paste the JSON
   downloaded from Firebase console > Project settings > Service accounts.

`render.yaml` points `GOOGLE_APPLICATION_CREDENTIALS` at
`/etc/secrets/service-account.json`, which is the first thing
`server/src/config/firebase.ts` looks for. The key is never baked into the
image: `server/.dockerignore` excludes `service-account.json`, so `COPY . .`
cannot capture it.

## Verify

```bash
curl -i https://<your-service>.onrender.com/products
```

Expect **401 Unauthorized**. That confirms the server started, the Firestore
client initialised, and auth middleware is live. A 500 instead means the secret
file could not be read.

## Free-tier limits

- Spins down after 15 minutes without inbound traffic. The first request after
  that takes roughly a minute to wake.
- 750 instance-hours per month, shared across the workspace.
- 512 MB RAM, 0.1 CPU.

## Why the Python tier is not deployed

`python/chatbot_server.py` needs roughly 2-3 GB for langchain, langgraph,
fastmcp and llama-cloud, which is above the free plan's 512 MB cap. Separately,
`UOA_API_KEY` and `LLAMA_CLOUD_API_KEY` are unset, so `/chat` and
`/scan/invoice` would return HTTP 503 "LLM not configured" wherever they ran.
The service returns that 503 rather than crashing on start, so it stays
deployable once a key exists.

## Pointing the app at the deployed backend

The Flutter app targets `10.0.2.2` on the emulator and `localhost` elsewhere.
Override with `--dart-define` when building against a deployed backend.

No credential is committed to this repository; secrets are supplied by whoever
deploys, through the Render dashboard.