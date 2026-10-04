import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import mcp_chatbot


class FakeResponse:
    def __init__(self, status_code=200, payload=None, text="", content=b"{}"):
        self.status_code = status_code
        self.ok = 200 <= status_code < 300
        self.payload = payload
        self.text = text
        self.content = content

    def json(self):
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


class McpRequestTests(unittest.TestCase):
    def test_request_forwards_user_token_and_json_payload(self):
        response = FakeResponse(payload={"saved": True})
        with (
            patch.object(mcp_chatbot, "TOKEN", "firebase-id-token"),
            patch.object(mcp_chatbot.requests, "request", return_value=response) as request,
        ):
            result = mcp_chatbot._request("POST", "/products", {"name": "Tea"})

        self.assertEqual(result, {"saved": True})
        request.assert_called_once_with(
            "POST",
            "http://localhost:3000/products",
            headers={
                "Authorization": "Bearer firebase-id-token",
                "Content-Type": "application/json",
            },
            json={"name": "Tea"},
            timeout=30,
        )

    def test_request_requires_a_signed_in_user(self):
        with (
            patch.object(mcp_chatbot, "TOKEN", None),
            patch.object(mcp_chatbot.requests, "request") as request,
        ):
            with self.assertRaisesRegex(PermissionError, "No user token"):
                mcp_chatbot._request("GET", "/products")

        request.assert_not_called()

    def test_request_maps_authentication_and_missing_resource_errors(self):
        cases = [
            (401, PermissionError, "Authentication failed"),
            (403, PermissionError, "Forbidden"),
            (404, LookupError, "Not found"),
        ]
        for status, error_type, message in cases:
            with self.subTest(status=status):
                response = FakeResponse(
                    status_code=status,
                    payload={"error": "server detail"},
                )
                with (
                    patch.object(mcp_chatbot, "TOKEN", "firebase-id-token"),
                    patch.object(
                        mcp_chatbot.requests,
                        "request",
                        return_value=response,
                    ),
                ):
                    with self.assertRaisesRegex(error_type, message):
                        mcp_chatbot._request("GET", "/products")

    def test_request_returns_empty_mapping_for_no_content(self):
        response = FakeResponse(content=b"")
        with (
            patch.object(mcp_chatbot, "TOKEN", "firebase-id-token"),
            patch.object(mcp_chatbot.requests, "request", return_value=response),
        ):
            self.assertEqual(mcp_chatbot._request("DELETE", "/products/1"), {})


class ProductAnalyticsTests(unittest.TestCase):
    def test_velocity_prefers_stored_value_then_estimates_from_sales(self):
        self.assertEqual(
            mcp_chatbot._velocity({"salesVelocity": 2.5, "totalSold": 90}),
            (2.5, "salesVelocity"),
        )
        self.assertEqual(
            mcp_chatbot._velocity({"salesVelocity": 0, "totalSold": 90}),
            (3.0, "estimated from totalSold / 30 days"),
        )
        self.assertEqual(
            mcp_chatbot._velocity({"salesVelocity": "invalid"}),
            (0.0, "no sales data"),
        )

    def test_compact_product_calculates_margin_and_stock_horizon(self):
        compact = mcp_chatbot._compact({
            "id": "coffee",
            "name": "Coffee",
            "costPrice": 4,
            "sellingPrice": 10,
            "totalStock": 12,
            "reorderPoint": 3,
            "totalSold": 30,
        })

        self.assertEqual(compact["margin"], 6)
        self.assertEqual(compact["marginPct"], 60)
        self.assertEqual(compact["velocity"], 1)
        self.assertEqual(compact["daysOfStockLeft"], 12)

    def test_low_stock_excludes_depleted_and_discontinued_items(self):
        products = [
            {"id": "low", "name": "Low", "totalStock": 3, "reorderPoint": 5},
            {"id": "healthy", "name": "Healthy", "totalStock": 6, "reorderPoint": 5},
            {"id": "empty", "name": "Empty", "totalStock": 0, "reorderPoint": 5},
            {
                "id": "discontinued",
                "name": "Old",
                "status": "discontinued",
                "totalStock": 1,
                "reorderPoint": 5,
            },
        ]
        with patch.object(mcp_chatbot, "_fetch_products", return_value=products):
            result = mcp_chatbot.low_stock_products()

        self.assertEqual(result["count"], 1)
        self.assertEqual(result["lowStock"][0]["id"], "low")

    def test_parse_datetime_accepts_utc_z_suffix(self):
        self.assertEqual(
            mcp_chatbot._parse_dt("2026-10-01T12:00:00Z"),
            datetime(2026, 10, 1, 12, tzinfo=timezone.utc),
        )


if __name__ == "__main__":
    unittest.main()
