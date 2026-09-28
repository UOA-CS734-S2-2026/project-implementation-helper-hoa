"""The one place this project decides which model it talks to: the UoA gateway."""

import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_URL = os.getenv("UOA_BASE_URL", "https://agent.elliottwen.info/v1")
MODEL = os.getenv("UOA_MODEL", "MiniMax-M3")


def get_llm(**kwargs) -> ChatOpenAI:
    api_key = os.getenv("UOA_API_KEY")
    if not api_key:
        raise RuntimeError("UOA_API_KEY is not set. Add it to the project root .env.")
    return ChatOpenAI(
        base_url=BASE_URL,
        api_key=api_key,
        model=MODEL,
        max_tokens=2048,
        **kwargs,
    )