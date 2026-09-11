# /// script
# requires-python = ">=3.11"
# dependencies = ["fastmcp>=3.4.4", "python-dotenv>=1.0.1", "requests>=2.31.0"]
# ///
import json
import os
import threading
import time
from pathlib import Path
from typing import Annotated, Optional

import requests
from dotenv import load_dotenv
from fastmcp import FastMCP
from pydantic import Field

PROJECT_ROOT = Path(__file__).resolve().parent.parent

load_dotenv(PROJECT_ROOT / ".env")

API_BASE_URL = os.getenv("MCP_API_BASE_URL", "http://localhost:3000")
MCP_SECRET = os.getenv("MCP_SECRET")
TOKEN = os.getenv("TOKEN")
mcp = FastMCP("HelperHoa", instructions="Tools to query and update the HelperHoa inventory through the Express API. All data flows Python -> HTTP -> Express -> Firestore.")

_token_cache: dict = {"value": None, "expires_at": 0}
_token_lock = threading.Lock()


# def _get_identity_token() -> str:
#     """Fetch (and cache) a Firebase ID token from the server's POST /auth/mcp-token.

#     The Express server handles all Firebase interaction; Python only makes HTTP
#     GET/POST calls. The token is cached and refreshed about a minute before expiry.
#     """
#     if _token_cache["value"] and _token_cache["expires_at"] - time.time() > 60:
#         return _token_cache["value"]

#     with _token_lock:
#         if _token_cache["value"] and _token_cache["expires_at"] - time.time() > 60:
#             return _token_cache["value"]

#         if not MCP_SECRET:
#             raise RuntimeError(
#                 "MCP_SECRET not found. Add it to the project root .env (must match "
#                 "the Express server's MCP_SECRET used by POST /auth/mcp-token)."
#             )
#         try:
#             resp = requests.post(
#                 f"{API_BASE_URL}/auth/token",
#                 headers={"X-MCP-Secret": MCP_SECRET},
#                 timeout=15,
#             )
#         except requests.ConnectionError as exc:
#             raise RuntimeError(
#                 f"Cannot reach server at {API_BASE_URL}. Is the Express server running?"
#             ) from exc
#         if resp.status_code == 401:
#             raise PermissionError(
#                 "Token endpoint rejected the request (401): "
#                 f"{resp.json().get('error', 'bad MCP_SECRET')}"
#             )
#         resp.raise_for_status()
#         data = resp.json()
#         if "idToken" not in data:
#             raise RuntimeError(f"Failed to get idToken from /auth/mcp-token: {data}")

#         expires_in = int(data.get("expiresIn", "3600"))
#         _token_cache["value"] = data["idToken"]
#         print(f"Fetched new identity token {data['idToken'][:8]}... (expires in {expires_in}s)")
#         _token_cache["expires_at"] = time.time() + expires_in - 60
#         return _token_cache["value"]


def _request(method: str, path: str, body: Optional[dict] = None) -> dict:
    """Send an authenticated request to the Express API and map errors clearly."""
    token = TOKEN  # _get_identity_token()
    url = f"{API_BASE_URL}{path}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    try:
        resp = requests.request(method, url, headers=headers, json=body, timeout=30)
    except requests.ConnectionError as exc:
        raise RuntimeError(
            f"Cannot reach server at {API_BASE_URL}. Is the Express server running?"
        ) from exc

    if resp.status_code == 401:
        raise PermissionError(f"Authentication failed (401): {resp.json().get('error', 'invalid token')}")
    if resp.status_code == 403:
        raise PermissionError(f"Forbidden (403): {resp.json().get('error', 'role not permitted')}")
    if resp.status_code == 404:
        raise LookupError(f"Not found (404): {resp.json().get('error', 'resource missing')}")
    if not resp.ok:
        raise RuntimeError(f"Request failed ({resp.status_code}): {resp.text}")

    if not resp.content:
        return {}
    return resp.json()


@mcp.tool()
def list_products(
    active_only: Annotated[bool, Field(description="Only return products with status 'active'")] = False,
) -> dict:
    """List all products in inventory via GET /products. Includes SKU, price, stock, status and batches."""
    query = "?active=true" if active_only else ""
    return _request("GET", f"/products{query}")


@mcp.tool()
def get_product(
    product_id: Annotated[str, Field(description="Product ID, e.g. prod_dell_monitor")],
) -> dict:
    """Get full details for a single product via GET /products/:id."""
    return _request("GET", f"/products/{product_id}")


# @mcp.tool()
# def create_product(
#     name: Annotated[str, Field(description="Display name of the product")],
#     sku: Annotated[str, Field(description="Stock-keeping unit; uppercased by the server")],
#     category: Annotated[str, Field(description="Product category")],
#     description: Annotated[str, Field(description="Long-text product description")],
#     cost_price: Annotated[float, Field(description="Unit cost price in dollars")],
#     selling_price: Annotated[float, Field(description="Unit selling price in dollars")],
#     tax_rate: Annotated[float, Field(description="Tax percentage applied, e.g. 15.0")],
#     reorder_point: Annotated[int, Field(description="Stock level that triggers a reorder alert")],
#     unit_of_measure: Annotated[str, Field(description="Unit, e.g. 'each', 'box'")],
#     tags: Annotated[list[str], Field(description="Tags for search/filter")] = [],
#     images: Annotated[list[str], Field(description="URLs of product images")] = [],
#     status: Annotated[str, Field(description="One of: active, discontinued, out_of_stock")] = "out_of_stock",
# ) -> dict:
#     """Create a new product via POST /products (requires the admin role)."""
#     payload = {
#         "name": name,
#         "sku": sku,
#         "category": category,
#         "description": description,
#         "costPrice": cost_price,
#         "sellingPrice": selling_price,
#         "taxRate": tax_rate,
#         "reorderPoint": reorder_point,
#         "unitOfMeasure": unit_of_measure,
#         "tags": tags,
#         "images": images,
#         "status": status,
#     }
#     return _request("POST", "/products", body=payload)


# @mcp.tool()
# def receive_inventory(
#     product_id: Annotated[str, Field(description="Product ID to restock, e.g. prod_dell_monitor")],
#     batch_number: Annotated[str, Field(description="Unique batch number, e.g. BATCH-2026-003")],
#     quantity: Annotated[int, Field(description="Units received in this batch")],
#     cost_price: Annotated[float, Field(description="Unit cost price for this batch")],
#     vendor_id: Annotated[str, Field(description="Vendor ID, e.g. vendor_jbhifi")],
#     invoice_number: Annotated[str, Field(description="Supplier invoice number")],
#     expiration_date: Annotated[Optional[str], Field(description="ISO date (YYYY-MM-DD) or null if not perishable")] = None,
# ) -> dict:
#     """Receive a new stock batch via POST /products/:id/batches (requires admin or manager role)."""
#     payload = {
#         "batchNumber": batch_number,
#         "quantity": quantity,
#         "costPrice": cost_price,
#         "vendorId": vendor_id,
#         "invoiceNumber": invoice_number,
#     }
#     if expiration_date:
#         payload["expirationDate"] = expiration_date
#     return _request("POST", f"/products/{product_id}/batches", body=payload)


# @mcp.tool()
# def sell_product(
#     product_id: Annotated[str, Field(description="Product ID to sell from, e.g. prod_dell_monitor")],
#     quantity: Annotated[int, Field(description="Units to sell (FIFO against batches)")],
#     batch_number: Annotated[Optional[str], Field(description="Optional specific batch to draw from")] = None,
# ) -> dict:
#     """Sell units of a product via POST /products/:id/sell (requires admin, manager or cashier role)."""
#     payload = {"quantity": quantity}
#     if batch_number:
#         payload["batchNumber"] = batch_number
#     return _request("POST", f"/products/{product_id}/sell", body=payload)


if __name__ == "__main__":
    mcp.run(show_banner=False)