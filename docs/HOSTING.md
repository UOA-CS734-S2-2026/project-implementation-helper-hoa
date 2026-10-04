# Hosting on Render

Deploys the Express tier (`server/`) to Render's free plan. No credit card.

That tier covers authentication, products, inventory, invoices, alerts, and the
admin API. The Python tier is not deployed; see below.

## Prerequisites

- A Render account
- **A Firebase project** with Firestore and Authentication enabled. The Android
  app (`android/app/google-services.json`) and the server's service account must
  belong to the **same** project: the app signs in against that project, and the
  backend verifies those tokens with its own key. `push.routes.ts` rejects a
  device reporting a different `projectId`, so a mismatch surfaces as HTTP 409 on
  device registration.

## Deploy

1. Push the branch, then in Render choose **New > Blueprint** and select the
   repository. Render reads `render.yaml` from the repo root.
2. Render prompts for the values marked `sync: false`. `PYTHON_AI_URL` stays
   empty. `FIREBASE_WEB_API_KEY` is required -- `AuthService` reads it in its
   constructor, so a blank value stops the server before it binds a port.
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

## Pointing the app at the deployed backend

`ApiConfig` reads `EXPRESS_BASE_URL` and `PYTHON_BASE_URL` from
`--dart-define`, falling back to `10.0.2.2:3000` and `10.0.2.2:8000` when they
are absent, so local development needs no arguments:

```bash
flutter run --dart-define=EXPRESS_BASE_URL=https://<your-service>.onrender.com
```

Leave `PYTHON_BASE_URL` unset.

## Ask Hoa and Snap are not hosted

Both features call the Python tier, which this deployment does not run. Each
reports that clearly instead of failing opaquely:

- `POST /api/ai/chat` -> `AI service is unreachable at http://localhost:8000`
- `POST /scan/invoice` -> `Could not reach the scanner at http://localhost:8000`

The blocker is memory: `python/chatbot_server.py` needs roughly 2-3 GB for
langchain, langgraph, fastmcp and llama-cloud, above the free plan's 512 MB cap.
It needs about 2 GB on a paid instance, and will 503 with "LLM not configured"
until `UOA_API_KEY` and `LLAMA_CLOUD_API_KEY` are set. To demo them, run the
Python tier locally alongside the deployed Express tier and pass
`--dart-define=PYTHON_BASE_URL=http://10.0.2.2:8000`; its MCP tools then read
through `MCP_API_BASE_URL`, which must point at the deployed Express URL.

## Free-tier limits

- Spins down after 15 minutes without inbound traffic. The first request after
  that takes roughly a minute to wake, so send one request just before
  presenting rather than leaving the audience watching a spinner.
- 750 instance-hours per month, shared across the workspace.
- 512 MB RAM, 0.1 CPU.

No credential is committed to this repository; secrets are supplied by whoever
deploys, through the Render dashboard.