"""HTTP server exposing the LangGraph HelperHoa chatbot as a REST API.

The Express server proxies Flutter chat messages here as POST /chat.

Run it (from the python/ folder):
    uvicorn chatbot_server:app --host 0.0.0.0 --port 8000
or simply:
    python chatbot_server.py
"""

import asyncio
import os
import sys
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from langchain.agents import create_agent
from langchain_mcp_adapters.client import MultiServerMCPClient
from pydantic import BaseModel

from llm import get_llm
from scan_service import extract_invoice

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

MCP_SERVER = Path(__file__).resolve().parent / "mcp_chatbot.py"
SYSTEM_PROMPT = (
    "You are the HelperHoa inventory assistant. Answer ONLY from what the "
    "tools report. Never invent data. Be brief."
)

app = FastAPI(title="HelperHoa Chatbot")

# The Flutter client talks to this server directly from a browser, so requests
# arrive cross-origin (the web dev server uses a different port). Without this
# the browser still sends the request and this server still returns 200, but it
# withholds the response body from the app, which surfaces as a bogus
# "server not running" error on the client.
#
# A regex rather than a fixed origin: the Flutter web dev server falls back to a
# random port when 8080 is taken, so the origin is not stable during development.
# No $ anchor is needed on the alternation: Starlette matches this with
# fullmatch(), which anchors implicitly, so "onrender.com.evil.com" is rejected.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http(s)?://(localhost|127\.0\.0\.1)(:\d+)?|https://([a-z0-9-]+\.)*(run\.app|onrender\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


def _mcp_client(user_token: str) -> MultiServerMCPClient:
    """Build a client whose MCP subprocess acts as the logged-in user.

    A fresh client (and therefore a fresh subprocess) is created per /chat call,
    so the token below belongs to exactly one request and cannot leak to the
    next caller. The env dict is handed to the child process as-is, and
    python-dotenv never overrides a variable that is already set, so TOKEN here
    wins over anything left in the project-root .env.
    """
    return MultiServerMCPClient(
        {
            "helperhoa": {
                "command": sys.executable,
                "args": [str(MCP_SERVER)],
                "transport": "stdio",
                "env": {
                    "PATH": os.environ.get("PATH", ""),
                    "FASTMCP_LOG_ENABLED": "false",
                    "MCP_API_BASE_URL": os.getenv("MCP_API_BASE_URL", "http://localhost:3000"),
                    "MCP_SECRET": os.getenv("MCP_SECRET", ""),
                    "TOKEN": user_token,
                },
            }
        }
    )


def _bearer_token(authorization: str | None) -> str:
    """Pull the Firebase ID token out of the Authorization header.

    Express verifies this token with requireAuth and forwards it verbatim, so
    rejecting it here keeps a direct caller from reaching the MCP tools.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header. Log in through the app first.",
        )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=401,
            detail="Authorization header must be 'Bearer <token>'.",
        )

    return token.strip()


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, authorization: str | None = Header(default=None)) -> ChatResponse:
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    user_token = _bearer_token(authorization)

    try:
        client = _mcp_client(user_token)
        tools = await client.get_tools()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"MCP tools unavailable: {exc}",
        ) from exc

    try:
        llm = get_llm()
    except Exception as exc:
        detail = str(exc)
        if "not set" in detail or "UOA_API_KEY" in detail:
            raise HTTPException(status_code=503, detail="LLM not configured") from exc
        raise HTTPException(status_code=500, detail=f"Agent failed: {exc}") from exc

    agent = create_agent(llm, tools, system_prompt=SYSTEM_PROMPT)

    messages: list[tuple[str, str]] = [
        (m.role, m.content) for m in request.history
    ]
    messages.append(("user", request.message))

    try:
        result = await agent.ainvoke({"messages": messages})
        reply = str(result["messages"][-1].content).strip()
    except Exception as exc:
        detail = str(exc)
        if "not set" in detail or "UOA_API_KEY" in detail or "LLAMA_CLOUD_API_KEY" in detail:
            raise HTTPException(status_code=503, detail="LLM not configured") from exc
        raise HTTPException(status_code=500, detail=f"Agent failed: {exc}") from exc

    return ChatResponse(reply=reply)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/scan/invoice")
async def scan_invoice(
    file: UploadFile = File(description="Invoice file (PDF or image)"),
) -> dict:
    """Run LlamaCloud extraction on the uploaded invoice and return structured JSON."""
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        return await asyncio.to_thread(
            extract_invoice, contents, file.filename or "invoice.pdf"
        )
    except Exception as exc:
        print(f"Scan failed: {exc}")
        detail = str(exc)
        if "not set" in detail or "LLAMA_CLOUD_API_KEY" in detail or "UOA_API_KEY" in detail:
            raise HTTPException(
                status_code=503,
                detail="LLM not configured",
            ) from exc
        raise HTTPException(
            status_code=502,
            detail=f"Invoice extraction failed: {exc}",
        ) from exc


if __name__ == "__main__":
    port = int(os.getenv("PORT") or os.getenv("PYTHON_AI_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)