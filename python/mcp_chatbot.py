# /// script
# requires-python = ">=3.11"
# dependencies = ["fastmcp>=3.4.4", "python-dotenv>=1.0.1", "requests>=2.31.0"]
# ///
import json
import os
from datetime import datetime, timedelta
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
# Injected by chatbot_server.py, which creates one subprocess per chat request
# and puts the signed-in user's Firebase ID token in this variable. The
# load_dotenv() above is a fallback only: dotenv does not override a variable
# that is already set, so a token passed down from the parent always wins.
TOKEN = os.getenv("TOKEN")
mcp = FastMCP("HelperHoa", instructions="Tools to query and update the HelperHoa inventory through the Express API. All data flows Python -> HTTP -> Express -> Firestore.")


def _error_detail(response) -> str:
    """Best-effort message from a failed response, without assuming JSON."""
    try:
        payload = response.json()
    except ValueError:
        return response.text[:200]

    if isinstance(payload, dict):
        return str(payload.get("error") or payload.get("message") or payload)[:200]

    return str(payload)[:200]


def _request(method: str, path: str, body: Optional[dict] = None) -> dict:
    """Send an authenticated request to the Express API and map errors clearly."""
    if not TOKEN:
        raise PermissionError(
            "No user token was supplied to the MCP server. Log in through the app first."
        )

    url = f"{API_BASE_URL}{path}"
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    try:
        resp = requests.request(method, url, headers=headers, json=body, timeout=30)
    except requests.ConnectionError as exc:
        raise RuntimeError(
            f"Cannot reach server at {API_BASE_URL}. Is the Express server running?"
        ) from exc

    if resp.status_code == 401:
        raise PermissionError(
            f"Authentication failed (401): {_error_detail(resp)}. The session may have expired."
        )
    if resp.status_code == 403:
        raise PermissionError(f"Forbidden (403): {_error_detail(resp)}")
    if resp.status_code == 404:
        raise LookupError(f"Not found (404): {_error_detail(resp)}")
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


def _fetch_products(active_only: bool = False) -> list:
    """Fetch all products from the API (the single source for every analytics tool)."""
    query = "?active=true" if active_only else ""
    data = _request("GET", f"/products{query}")
    return data if isinstance(data, list) else []


def _money(x) -> float:
    try:
        return round(float(x or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def _parse_dt(value) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _velocity(p: dict) -> tuple[float, str]:
    """Estimated units sold per day; uses stored salesVelocity when available."""
    try:
        raw = float(p.get("salesVelocity") or 0)
    except (TypeError, ValueError):
        raw = 0.0
    if raw > 0:
        return raw, "salesVelocity"
    try:
        sold = float(p.get("totalSold") or 0)
    except (TypeError, ValueError):
        sold = 0.0
    if sold > 0:
        return round(sold / 30.0, 2), "estimated from totalSold / 30 days"
    return 0.0, "no sales data"


def _days_of_stock_left(p: dict) -> float | None:
    vel, _ = _velocity(p)
    try:
        stock = float(p.get("totalStock") or 0)
    except (TypeError, ValueError):
        stock = 0.0
    if vel > 0:
        return round(stock / vel, 1)
    return None


def _compact(p: dict) -> dict:
    """Trim a full product to the fields the LLM actually needs (no batches)."""
    selling = _money(p.get("sellingPrice"))
    cost = _money(p.get("costPrice"))
    margin = round(selling - cost, 2)
    vel, note = _velocity(p)
    return {
        "id": p.get("id"),
        "name": p.get("name"),
        "sku": p.get("sku"),
        "category": p.get("category"),
        "status": p.get("status"),
        "unitOfMeasure": p.get("unitOfMeasure"),
        "totalStock": _money(p.get("totalStock")),
        "reorderPoint": _money(p.get("reorderPoint")),
        "totalSold": _money(p.get("totalSold")),
        "costPrice": cost,
        "sellingPrice": selling,
        "margin": margin,
        "marginPct": round((margin / selling) * 100, 1) if selling else 0.0,
        "velocity": vel,
        "daysOfStockLeft": _days_of_stock_left(p),
        "note": note,
    }


@mcp.tool()
def low_stock_products(
    limit: Annotated[int, Field(description="Max products to return")] = 10,
) -> dict:
    """Top products on the brink of being sold out: some stock left but at or below the reorder point."""
    cands = [
        p for p in _fetch_products()
        if p.get("status") != "discontinued"
        and 0 < _money(p.get("totalStock")) <= _money(p.get("reorderPoint"))
    ]
    cands.sort(key=lambda p: (
        0 if _velocity(p)[0] > 0 else 1,
        _days_of_stock_left(p) if _days_of_stock_left(p) is not None else 10 ** 9,
        _money(p.get("totalStock")),
    ))
    rows = [_compact(p) for p in cands[:limit]]
    return {"count": len(rows), "limit": limit, "lowStock": rows}


@mcp.tool()
def fast_moving_products(
    limit: Annotated[int, Field(description="Max products to return")] = 10,
) -> dict:
    """Products selling fastest, ranked by units sold per day (estimated)."""
    scored = [
        (_velocity(p)[0], _compact(p))
        for p in _fetch_products()
        if p.get("status") != "discontinued" and _velocity(p)[0] > 0
    ]
    scored.sort(key=lambda x: x[0], reverse=True)
    rows = [c for _, c in scored[:limit]]
    return {"count": len(rows), "limit": limit, "fastMoving": rows}


@mcp.tool()
def out_of_stock_products() -> dict:
    """All products currently out of stock (status 'out_of_stock' or zero stock)."""
    rows = [
        _compact(p)
        for p in _fetch_products()
        if p.get("status") == "out_of_stock" or _money(p.get("totalStock")) == 0
    ]
    rows.sort(key=lambda c: c["name"] or "")
    return {"count": len(rows), "outOfStock": rows}


@mcp.tool()
def slow_moving_products(
    limit: Annotated[int, Field(description="Max products to return")] = 10,
    max_velocity: Annotated[float, Field(description="Only products selling at or below this many units/day")] = 1.0,
) -> dict:
    """Products holding stock that is barely selling (units/day <= max_velocity): clearance / dead-stock candidates."""
    scored = [
        (_velocity(p)[0], _compact(p))
        for p in _fetch_products()
        if p.get("status") != "discontinued"
        and _money(p.get("totalStock")) > _money(p.get("reorderPoint"))
        and _velocity(p)[0] <= max_velocity
    ]
    scored.sort(key=lambda x: x[0])
    rows = [c for _, c in scored[:limit]]
    return {"count": len(rows), "limit": limit, "maxVelocity": max_velocity, "slowMoving": rows}


@mcp.tool()
def top_selling_products(
    limit: Annotated[int, Field(description="Max products to return")] = 10,
    by: Annotated[str, Field(description="Rank by 'units' or 'revenue'")] = "revenue",
) -> dict:
    """Best-selling products, ranked by units sold or revenue generated."""
    rows = []
    for p in _fetch_products():
        if p.get("status") == "discontinued":
            continue
        row = _compact(p)
        row["revenue"] = round(_money(p.get("totalSold")) * _money(p.get("sellingPrice")), 2)
        rows.append(row)
    key = "revenue" if by == "revenue" else "totalSold"
    rows.sort(key=lambda c: c.get(key, 0), reverse=True)
    return {"count": len(rows), "limit": limit, "by": key, "topSelling": rows[:limit]}


@mcp.tool()
def top_profit_products(
    limit: Annotated[int, Field(description="Max products to return")] = 10,
) -> dict:
    """Most profitable products by gross margin per unit (selling price - cost)."""
    rows = [
        _compact(p)
        for p in _fetch_products()
        if p.get("status") != "discontinued"
    ]
    rows.sort(key=lambda c: c.get("margin", 0), reverse=True)
    return {"count": len(rows), "limit": limit, "topProfit": rows[:limit]}


@mcp.tool()
def category_breakdown() -> dict:
    """Aggregate inventory and sales stats per product category (active products only)."""
    by_cat: dict[str, dict] = {}
    for p in _fetch_products():
        if p.get("status") == "discontinued":
            continue
        cat = (p.get("category") or "Uncategorized").strip() or "Uncategorized"
        entry = by_cat.setdefault(cat, {"skus": 0, "units": 0.0, "costValue": 0.0, "retailValue": 0.0, "margin": 0.0, "velocity": 0.0, "outOfStock": 0})
        stock = _money(p.get("totalStock"))
        cost = _money(p.get("costPrice"))
        selling = _money(p.get("sellingPrice"))
        vel, _ = _velocity(p)
        entry["skus"] += 1
        entry["units"] += stock
        entry["costValue"] += stock * cost
        entry["retailValue"] += stock * selling
        entry["margin"] += stock * (selling - cost)
        entry["velocity"] += vel
        if _money(p.get("totalStock")) == 0:
            entry["outOfStock"] += 1
    cats = []
    for name, e in by_cat.items():
        cats.append({
            "category": name,
            "skus": e["skus"],
            "totalUnits": round(e["units"], 2),
            "costValue": round(e["costValue"], 2),
            "retailValue": round(e["retailValue"], 2),
            "potentialProfit": round(e["margin"], 2),
            "marginPct": round((e["margin"] / e["retailValue"]) * 100, 1) if e["retailValue"] else 0.0,
            "velocity": round(e["velocity"], 2),
            "outOfStock": e["outOfStock"],
        })
    cats.sort(key=lambda c: c["retailValue"], reverse=True)
    return {"count": len(cats), "categories": cats}


@mcp.tool()
def inventory_value() -> dict:
    """Whole-store snapshot: stock value at cost and retail, potential profit, health counts."""
    active = [p for p in _fetch_products() if p.get("status") != "discontinued"]
    units = cost_value = retail_value = profit = 0.0
    low = 0
    for p in active:
        stock = _money(p.get("totalStock"))
        cost = _money(p.get("costPrice"))
        selling = _money(p.get("sellingPrice"))
        units += stock
        cost_value += stock * cost
        retail_value += stock * selling
        profit += stock * (selling - cost)
        if stock > 0 and stock <= _money(p.get("reorderPoint")):
            low += 1
    out = sum(1 for p in active if p.get("status") == "out_of_stock" or _money(p.get("totalStock")) == 0)
    return {
        "activeSkus": len(active),
        "totalUnits": round(units, 2),
        "stockValueAtCost": round(cost_value, 2),
        "stockValueAtRetail": round(retail_value, 2),
        "potentialProfit": round(profit, 2),
        "marginPct": round((profit / retail_value) * 100, 1) if retail_value else 0.0,
        "lowStockCount": low,
        "outOfStockCount": out,
    }


@mcp.tool()
def expiring_stock(
    within_days: Annotated[int, Field(description="Flag batches expiring within this many days")] = 60,
    limit: Annotated[int, Field(description="Max batches to return")] = 10,
) -> dict:
    """Stock batches whose expiry is approaching, soonest first (perishable stock)."""
    now = datetime.now().astimezone()
    horizon = now + timedelta(days=max(within_days, 0))
    rows = []
    for p in _fetch_products():
        if p.get("status") == "discontinued":
            continue
        for b in (p.get("batches") or []):
            exp = _parse_dt(b.get("expirationDate"))
            if not exp:
                continue
            received = _parse_dt(b.get("receivedDate"))
            if received and exp <= received:
                continue
            if now <= exp <= horizon:
                rows.append({
                    "productId": p.get("id"),
                    "name": p.get("name"),
                    "sku": p.get("sku"),
                    "batchNumber": b.get("batchNumber"),
                    "quantity": _money(b.get("quantity")),
                    "expirationDate": exp.isoformat(),
                })
    rows.sort(key=lambda r: r["expirationDate"])
    return {"count": len(rows), "withinDays": within_days, "limit": limit, "expiring": rows[:limit]}


@mcp.tool()
def aging_stock(
    limit: Annotated[int, Field(description="Max batches to return")] = 10,
) -> dict:
    """Oldest stock batches still on hand by receive date (stale inventory)."""
    rows = []
    for p in _fetch_products():
        if p.get("status") == "discontinued":
            continue
        for b in (p.get("batches") or []):
            received = _parse_dt(b.get("receivedDate"))
            qty = _money(b.get("quantity"))
            if not received or qty <= 0:
                continue
            rows.append({
                "productId": p.get("id"),
                "name": p.get("name"),
                "sku": p.get("sku"),
                "batchNumber": b.get("batchNumber"),
                "quantity": qty,
                "receivedDate": received.isoformat(),
                "daysOnHand": max((datetime.now().astimezone() - received).days, 0),
            })
    rows.sort(key=lambda r: r["receivedDate"])
    return {"count": len(rows), "limit": limit, "aging": rows[:limit]}


@mcp.tool()
def stock_alerts_summary() -> dict:
    """One-call morning briefing: health counts plus the worst low-stock and fastest movers."""
    products = _fetch_products()
    active = [p for p in products if p.get("status") != "discontinued"]
    low = [
        _compact(p) for p in active
        if 0 < _money(p.get("totalStock")) <= _money(p.get("reorderPoint"))
    ]
    low.sort(key=lambda c: (c["daysOfStockLeft"] if c["daysOfStockLeft"] is not None else 10 ** 9))
    out = [c for c in (_compact(p) for p in active) if c["status"] == "out_of_stock" or c["totalStock"] == 0]
    scored = [(_velocity(p)[0], _compact(p)) for p in active]
    scored.sort(key=lambda x: x[0], reverse=True)
    fast = [c for _, c in scored if c["velocity"] > 0][:5]
    return {
        "totalActiveSkus": len(active),
        "lowStockCount": len(low),
        "outOfStockCount": len(out),
        "fastMovingCount": len(fast),
        "worstLowStock": low[:5],
        "fastestMovers": fast,
    }


@mcp.tool()
def restock_suggestion(
    product_id: Annotated[str, Field(description="Product ID, e.g. prod_dell_monitor")],
) -> dict:
    """Read-only restock recommendation: how many units to order to get back above the reorder point."""
    p = _request("GET", f"/products/{product_id}")
    stock = _money(p.get("totalStock"))
    reorder = _money(p.get("reorderPoint"))
    suggested = max(0.0, 2 * reorder - stock)
    return {
        "product": _compact(p),
        "currentStock": stock,
        "reorderPoint": reorder,
        "recommendedOrderQty": suggested,
        "note": "Order enough to bring stock to 2x the reorder point.",
    }


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