# Cloud Run Hosting Guide

## Prerequisites
- Google Cloud account with billing enabled (free tier available)
- gcloud CLI installed and authenticated (`gcloud auth login`)
- Docker installed locally (for building images)

## 1) Create GCP project
Create or select a project. Note: Firebase client (Android) and Admin SDK can be different projects; this guide uses your own Firebase project.

## 2) Enable APIs
Enable required APIs:
- Cloud Run API
- Artifact Registry API
- Firestore API
- Identity and Access Management (IAM) API

## 3) Firebase setup (faculty create their own)
- Create a Firebase project (or reuse). The Android app uses `helper-hoa-sc` as client ID in google-services.json; for a hosted deployment, create your own Firebase project and update `android/app/google-services.json` if needed.
- Enable Firestore and Authentication.
- Download a Service Account key (Project Settings > Service Accounts > Generate new private key). Keep this file secure; do NOT commit it. For Cloud Run, prefer Application Default Credentials with an attached service account instead of baking this key into images.
- Grant the Cloud Run service account `roles/datastore.user` (and any other needed roles).

## 4) Store secrets in Secret Manager (recommended)
Create secrets for API keys:
- `uoa-api-key`
- `llama-cloud-api-key`
- `mcp-secret` (shared secret between Python and Express tiers)
- `firebase-web-api-key`

## 5) Build and push images to Artifact Registry
Create a Docker repository in Artifact Registry (e.g., `us-central1-docker.pkg.dev/<PROJECT_ID>/helperhoa`).

Build and push server:
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/<PROJECT_ID>/helperhoa/server:latest ./server
```

Build and push Python:
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/<PROJECT_ID>/helperhoa/python:latest ./python
```

## 6) Deploy Python service
```bash
gcloud run deploy helperhoa-python \
  --image us-central1-docker.pkg.dev/<PROJECT_ID>/helperhoa/python:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --cpu 1 --memory 2Gi \
  --min-instances 0 --max-instances 1 \
  --set-secrets UOA_API_KEY=uoa-api-key:latest,LLAMA_CLOUD_API_KEY=llama-cloud-api-key:latest,MCP_SECRET=mcp-secret:latest,MCP_API_BASE_URL=mcp-api-base-url:latest
```
Note: MCP_API_BASE_URL should point to the Express service URL (e.g., https://helperhoa-server-<hash>-<region>.run.app). Set after deploying Express, or update the service.

## 7) Deploy Express service
```bash
gcloud run deploy helperhoa-server \
  --image us-central1-docker.pkg.dev/<PROJECT_ID>/helperhoa/server:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_WEB_API_KEY=<your-key>,PYTHON_AI_URL=<python-service-url> \
  --set-secrets MCP_SECRET=mcp-secret:latest \
  --service-account <cloud-run-sa>@<PROJECT_ID>.iam.gserviceaccount.com
```
Attach a service account with `roles/datastore.user`. The server uses Application Default Credentials; do not mount service-account.json.

## 8) Update environment references
After both services are deployed, update:
- Python service: set `MCP_API_BASE_URL` to the Express URL
- Express service: set `PYTHON_AI_URL` to the Python URL

## Notes
- The Python service returns HTTP 503 "LLM not configured" if required API keys are missing.
- CORS allows `https://*.run.app` and loopback origins for local development.
- Never commit secrets or service-account.json. The .gitignore already excludes them.
