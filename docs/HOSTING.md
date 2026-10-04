# Hosting Guide

The Express tier (`server/`) is the only part that is deployed here. It covers
authentication, products, inventory, invoices, alerts, and the admin API.

## Why only the Express tier

The Python tier (`python/chatbot_server.py`) is not deployed, for two reasons:

- **Memory.** It needs roughly 2-3 GB for langchain, langgraph, fastmcp and
  llama-cloud. Render's free plan caps a service at 512 MB / 0.1 CPU.
- **Missing keys.** `UOA_API_KEY` and `LLAMA_CLOUD_API_KEY` are unset, so
  `/chat` and `/scan/invoice` would return HTTP 503 "LLM not configured"
  regardless of where they run.

The service returns that 503 deliberately rather than crashing on start, so the
tier stays deployable once someone supplies a key.

---

## Option A: Render (recommended, no credit card)

### Prerequisites
- A Render account (free tier, no card required)
- Docker installed locally
- **Your own Firebase project** with Firestore and Authentication enabled. Do not
  reuse this repository's working project; faculty should each supply their own.

### Deploy
1. Push this branch and open the repo in Render: **New > Blueprint**.
2. Render detects `render.yaml` at the repo root.
3. Render prompts for the two `sync: false` values. Leave `PYTHON_AI_URL` empty
   until a Python tier exists.
4. Add the Firebase credential as a **Secret File** (not an env var):
   Dashboard > Environment > Secret Files > Add, filename `service-account.json`,
   paste the JSON downloaded from Firebase console > Project settings >
   Service accounts.

`render.yaml` sets `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/service-account.json`,
which is the first thing `server/src/config/firebase.ts` checks. The key is
never baked into the image: `server/.dockerignore` excludes
`service-account.json`, so `COPY . .` cannot capture it.

### Verify
```bash
curl -i https://<your-service>.onrender.com/products
```
Expect **401 Unauthorized**. That proves the server is up, the Firestore client
initialised, and auth middleware is live. A 500 here instead means the service
account could not be read.

### Free-tier limits to expect
- Spins down after 15 minutes without inbound traffic; the first request after
  that takes roughly a minute to wake.
- 750 instance-hours per month shared across the workspace.
- 512 MB RAM, 0.1 CPU.

CORS accepts `https://*.onrender.com` so the Flutter web build can call the API.

---

## Option B: Google Cloud Run (needs a billing account)

Requires a card. Keep this for when one is available; the Dockerfiles are
provider-neutral.

### Deploy the server
```bash
gcloud builds submit --tag <registry>/server:latest ./server
gcloud run deploy helperhoa-server \
  --image <registry>/server:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account <sa>@<PROJECT_ID>.iam.gserviceaccount.com
```

Attach a service account holding `roles/datastore.user`; `firebase.ts` falls back
to Application Default Credentials when no key file is present, so no
`service-account.json` is needed in the image.

The Python tier, if ever deployed, needs `--cpu 1 --memory 2Gi` and
`--min-instances 0 --max-instances 1`.

---

## Notes
- Secrets are supplied by whoever deploys, through the provider's dashboard. No
  credential is committed to this repository.
- `MCP_SECRET` is only needed once the Python tier is running.
- The Flutter app still points at `10.0.2.2` (emulator) or `localhost` by
  default. Override with `--dart-define` when pointing a build at a deployed
  backend.
