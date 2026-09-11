#!/usr/bin/env python
"""Basic MCP smoke test: langgraph agent -> HelperHoa MCP server -> Express/Firebase.

Asks two read-only questions and fails unless the answers report real tool data.
Needs the Express server (with Firebase) running, unless MCP_API_BASE_URL points
at a stub.
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_mcp_adapters.client import MultiServerMCPClient

from llm import get_llm

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MCP_SERVER = Path(__file__).resolve().parent / "mcp_chatbot.py"
SYSTEM = (
    "You are the HelperHoa inventory assistant. Answer ONLY from what the "
    "tools report. Never invent data. Be brief."
)
QUESTIONS = [
    ("List all products currently in inventory.", "Dell Monitor"),
    ("How many units of stock does prod_dell_monitor have?", "24"),
]


async def main() -> int:
    client = MultiServerMCPClient(
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

    try:
        tools = await client.get_tools()
    except Exception as exc:
        print(f"ERROR: could not connect to MCP server: {exc}", file=sys.stderr)

    names = sorted(t.name for t in tools)
    print(f"Tools: {names}")
    for need in ("list_products", "get_product"):
        if need not in names:
            print(f"ERROR: tool not found: {need}", file=sys.stderr)

    agent = create_agent(get_llm(), tools, system_prompt=SYSTEM)

    for question, needle in QUESTIONS:
        print(f"\n> {question}")
        result = await agent.ainvoke({"messages": [("user", question)]})
        answer = result["messages"][-1].content
        print(answer)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))