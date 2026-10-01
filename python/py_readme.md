# MCP Chatbot Setup

## Environment Configuration

Create a `.env` file in the project root:

```dotenv
UOA_API_KEY=your_uoa_api_key
FIREBASE_WEB_API_KEY=your_firebase_web_api_key
FIREBASE_PROJECT_ID=helperhoa-cef06
PORT=3000
NODE_ENV=development
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
ALLOWED_ORIGIN=http://localhost:3000
LLAMA_CLOUD_API_KEY=your_llama_cloud_api_key
```

There is no `TOKEN` to configure. The chatbot has no credentials of its own: the
Express server forwards the signed-in user's ID token to `POST /chat`, and
`chatbot_server.py` passes it to `mcp_chatbot.py` through the subprocess
environment. Requests without one are rejected with 401.

## Seed the login accounts

```powershell
npx tsx src/scripts/seed.ts
```

This creates a Firebase Auth record for each of the three demo roles
(`admin@example.com`, `manager@example.com`, `cashier@example.com`, password
`password123`) and stores the matching role document in Firestore. The app logs
in with these, and `server/src/scripts/get-token.ts` remains available for
minting a token by hand when testing with curl.

## Install Python Dependencies

```terminal
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r python\requirements.txt
```

## Run the Backend

In Terminal 1:

```powershell
npm install
npm run dev
```

## Run the MCP Chatbot

In Terminal 2:

```powershell
.\.venv\Scripts\Activate.ps1
python python\mcp_chatbot.py
```
In Terminal 3:
```powershell
.\.venv\Scripts\Activate.ps1
python python\chatbot_server.py
```