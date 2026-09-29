"""Demo entry point for the LlamaCloud invoice scanner.

   python scanner.py <path-to-invoice.pdf>
Writes the extracted JSON to extracted.json and prints it.
Production callers should use `POST /scan/invoice` on the chatbot server.
"""

import json
import sys
from pathlib import Path

from scan_service import extract_invoice


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scanner.py <path-to-invoice>", file=sys.stderr)
        return 1

    source = Path(sys.argv[1])
    if not source.is_file():
        print(f"File not found: {source}", file=sys.stderr)
        return 1

    data = extract_invoice(source.read_bytes(), source.name)
    extracted = data["extract"]

    Path("extracted.json").write_text(json.dumps(extracted, indent=2))
    print(json.dumps(extracted, indent=2))

    for field, meta in (data.get("metadata") or {}).items():
        print(f"{field}: {meta}")

    return 0


if __name__ == "__main__":
    sys.exit(main())