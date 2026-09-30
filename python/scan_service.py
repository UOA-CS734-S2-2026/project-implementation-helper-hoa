"""LlamaCloud invoice extraction service.

Turns an uploaded invoice (PDF/image bytes) into structured JSON using
LlamaCloud's Agentic extraction. The `data_schema` here is the extraction
contract for the AI parser — it is NOT a Firestore schema.
"""

import os
import tempfile
import time
from pathlib import Path

from dotenv import load_dotenv
from llama_cloud import LlamaCloud

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

_client: LlamaCloud | None = None


def _get_client() -> LlamaCloud:
    global _client
    if _client is None:
        api_key = os.getenv("LLAMA_CLOUD_API_KEY")
        if not api_key:
            raise RuntimeError("LLAMA_CLOUD_API_KEY is not set. Add it to the project root .env.")
        _client = LlamaCloud(api_key=api_key)
    return _client


# Schema from the LlamaCloud playground (invoice parsing contract).
data_schema = {
    "type": "object",
    "properties": {
        "invoice_number": {"type": "string", "description": "Unique invoice identifier"},
        "invoice_date": {"type": "string", "description": "Invoice date (YYYY-MM-DD format)"},
        "due_date": {"type": "string", "description": "Payment due date (YYYY-MM-DD format)"},
        "vendor": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Vendor or contractor name"},
                "email": {"type": "string", "description": "Vendor email address"},
                "phone": {"type": "string", "description": "Vendor phone number"},
                "address": {"type": "string", "description": "Vendor address"},
            },
            "required": ["name"],
        },
        "bill_to": {
            "type": "object",
            "properties": {
                "property_address": {"type": "string", "description": "HOA property address"},
                "contact_name": {"type": "string", "description": "Contact person name"},
            },
        },
        "line_items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "product_name": {"type": "string", "description": "Item or service name"},
                    "description": {"type": "string", "description": "Item or service description"},
                    "quantity": {"type": "number", "description": "Quantity ordered"},
                    "unit_price": {"type": "number", "description": "Price per unit"},
                    "total": {"type": "number", "description": "Line item total"},
                    "category": {
                        "type": "string",
                        "enum": [
                            "Maintenance",
                            "Repair",
                            "Labor",
                            "Materials",
                            "Professional Services",
                            "Utilities",
                            "Other",
                        ],
                        "description": "Expense category",
                    },
                },
                "required": ["product_name", "quantity", "unit_price"],
            },
            "description": "List of items or services",
        },
        "subtotal": {"type": "number", "description": "Sum before taxes and fees"},
        "tax": {"type": "number", "description": "Tax amount"},
        "tax_rate": {"type": "number", "description": "Tax rate as percentage (e.g., 15 for 15%)"},
        "discount": {"type": "number", "description": "Discount amount if applicable"},
        "total_amount": {"type": "number", "description": "Total invoice amount due"},
        "payment_terms": {"type": "string", "description": "Payment terms (e.g., Net 30, Due on Receipt)"},
        "payment_method": {"type": "string", "description": "Accepted payment methods"},
        "purchase_order": {"type": "string", "description": "Associated purchase order number if any"},
        "notes": {"type": "string", "description": "Additional notes or special instructions"},
    },
    "required": ["invoice_number", "vendor", "total_amount"],
}


def extract_invoice(file_bytes: bytes, filename: str | None = None) -> dict:
    """Extract structured fields from an invoice file (PDF or image).

    Args:
        file_bytes: Raw file contents uploaded by the client.
        filename: Optional original filename, used for logging/extension hints.

    Returns:
        The extracted JSON dict (per `data_schema`), plus per-field metadata.
    """
    if not file_bytes:
        raise ValueError("Empty file provided.")

    suffix = Path(filename or "invoice").suffix or ".pdf"
    client = _get_client()

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        file_obj = client.files.create(file=tmp_path, purpose="extract")

        job = client.extract.create(
            file_input=file_obj.id,
            configuration={
                "data_schema": data_schema,
                "tier": "agentic",
                "extraction_target": "per_doc",
                "parse_tier": "agentic",
                "cite_sources": True,
                "confidence_scores": True,
            },
        )

        while job.status not in ("COMPLETED", "FAILED", "CANCELLED"):
            time.sleep(2)
            job = client.extract.get(job.id)

        if job.status != "COMPLETED":
            raise RuntimeError(
                f"Extract job {job.id} ended in {job.status}: {job.error_message}"
            )

        result = dict(job.extract_result) if isinstance(job.extract_result, dict) else {}

        metadata = {}
        if job.extract_metadata and job.extract_metadata.field_metadata:
            doc_meta = job.extract_metadata.field_metadata.document_metadata or {}
            for field, meta in doc_meta.items():
                metadata[str(field)] = str(meta)

        return {"extract": result, "metadata": metadata}
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass