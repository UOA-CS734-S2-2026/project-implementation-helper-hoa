# Python AI tier

Setup shared by all three tiers — the two `.env` files, the Firebase service
account, seeding, and how to start each server — is in the
[root README](../README.md). This file covers only the Python tier.

Two processes make up this tier, and both are needed.

## Install dependencies

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r python\requirements.txt
```

## The two processes

`chatbot_server.py` is the FastAPI service the Flutter app calls on port 8000. It
spawns one `mcp_chatbot.py` subprocess per chat request and injects the caller's
Firebase ID token into that subprocess environment.

```powershell
python python\chatbot_server.py
```

`mcp_chatbot.py` is the MCP server holding the tools. It calls back into the
Express API on port 3000 using `MCP_API_BASE_URL`, authenticating with
`MCP_SECRET`. Run it directly when you want to drive the tools from an MCP
client:

```powershell
python python\mcp_chatbot.py
```

## Authentication

There is no `TOKEN` to configure, and the chatbot has no credentials of its own.
The Express server forwards the signed-in user's Firebase ID token to
`POST /chat`; `chatbot_server.py` passes it down through the subprocess
environment, and dotenv does not overwrite a variable that is already set, so
the injected token always wins over anything in `.env`. Requests without one are
rejected with 401.

## Configuration

This tier reads the project-root `.env` only. The model gateway and port
settings come from `UOA_BASE_URL`, `UOA_MODEL` and `PYTHON_AI_PORT`; the
scanner additionally uses `LLAMA_CLOUD_API_KEY`. See
[.env.example](../.env.example) for the full list.

The Python tier never reads `server/service-account.json` and never talks to
Firestore — it goes through the Express API.
