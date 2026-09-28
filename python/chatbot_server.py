"""HTTP server exposing the LangGraph HelperHoa chatbot as a REST API.

The Express server proxies Flutter chat messages here as POST /chat.

Run it (from the python/ folder):
    uvicorn chatbot_server:app --host 0.0.0.0 --port 8000
or simply:
    python chatbot_server.py
"""

import os
import sys
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from langchain.agents import create_agent
from langchain_mcp_adapters.client import MultiServerMCPClient
from pydantic import BaseModel

from llm import get_llm

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

MCP_SERVER = Path(__file__).resolve().parent / "mcp_chatbot.py"
SYSTEM_PROMPT = (
    "You are the HelperHoa inventory assistant. Answer ONLY from what the "
    "tools report. Never invent data. Be brief."
)

app = FastAPI(title="HelperHoa Chatbot")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


def _mcp_client() -> MultiServerMCPClient:
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
                },
            }
        }
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    try:
        client = _mcp_client()
        tools = await client.get_tools()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"MCP tools unavailable: {exc}",
        ) from exc

    agent = create_agent(get_llm(), tools, system_prompt=SYSTEM_PROMPT)

    messages: list[tuple[str, str]] = [
        (m.role, m.content) for m in request.history
    ]
    messages.append(("user", request.message))

    try:
        result = await agent.ainvoke({"messages": messages})
        reply = str(result["messages"][-1].content).strip()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Agent failed: {exc}") from exc

    return ChatResponse(reply=reply)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.getenv("PYTHON_AI_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)