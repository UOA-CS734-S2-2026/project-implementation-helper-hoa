# Helper Hoa — User Guide

This guide walks through every screen in the Helper Hoa app and the step-by-step actions available to store staff or the owner.

---

## Navigation

A bottom navigation bar (or main menu) switches between **Home**, **Inventory**, **Stock Input**, **Sales**, and **Ask Hoa**. A **search bar** with a **filter** option sits above most pages.

---

## 1. Home Page

**Purpose:** Quick daily snapshot of the store when the app opens.

**Steps:**
1. Open the app — the Home page loads automatically.
2. View the **Today's Sales Summary** card at the top (total revenue, number of transactions).
3. Scroll through **Critical Inventory Alerts** (e.g. "Milk — 3 units left", "Bread — expires tomorrow").
4. Tap an alert to jump straight to that product's entry on the Inventory page.
5. Check the **Quick Metrics** tiles (total products, low-stock count, top seller) for a fast overview without opening other pages.

---

## 2. Inventory Page

**Purpose:** Browse, inspect, and act on individual products.

**Steps — Browsing:**
1. Open the Inventory tab — products load as small cards in a grid/list (name, photo, quantity, price).
2. Scroll down; when you reach the end, tap **Load More** to fetch the next batch (pagination, so the whole database isn't loaded at once).

**Steps — Viewing details:**
3. Tap any product card — it **expands in place** to ~2–3x its original size with a smooth animation.
4. Review the expanded details: supplier, buying/selling price, shelf number, expiry date, restock history.
5. Tap the card again (or its close icon) to **collapse** it back to normal size.

**Steps — Taking action from an expanded card:**
6. Tap the **email supplier / restock** icon if you need to reorder (see Section 7).
7. Use **search or filters** (see Section 3) at the top of this page to narrow down the product list first, if needed.

---

## 3. Search & Filter (appears on top of other pages)

**Purpose:** Quickly locate specific products.

**Steps — Searching:**
1. Tap the **search bar** at the top of the page.
2. Type a product name or attribute — results update in real time (or after you submit, depending on setting).
3. Tap a result to open that product.

**Steps — Filtering:**
4. Tap the **filter icon** next to the search bar — a popup opens, centered on the screen.
5. Choose one or more filters: **category, stock status, price range, supplier, last restocked date**.
6. Selected filters appear as chips/tags so you can see what's active.
7. Tap **Apply** to filter the list, or **Clear** to reset all filters.
8. To remove a single filter, tap the "x" on its chip without clearing everything else.

---

## 4. Ask Hoa (Chatbot Interface)

**Purpose:** Ask the AI assistant questions about inventory and sales.

**Steps:**
1. Open the **Ask Hoa** tab — a set of **pre-prepared question bubbles** appears (e.g. "What's my low-stock inventory?", "Which products are selling best?").
2. Tap a bubble that matches what you want to know.
3. The app asks a **follow-up prompt** for more context — e.g. select a product, choose a date range, or pick a specific metric. Add any extra detail in free text if needed.
4. Tap **Submit/Send** — your original question plus the added context is sent together.
5. A **loading indicator** shows while the app processes the request.
6. Read the chatbot's response, which may include reasoning, possible scenarios, and suggested actions (e.g. "Consider a 10% discount on Product X").
7. Ask a follow-up question — the conversation keeps prior context, so you don't need to repeat yourself.
8. If something fails, an error/fallback message appears instead of leaving you with a blank screen — you can retry or rephrase.

---

## 5. Stock Input Page

**Purpose:** Get invoice data into the system without typing it manually.

**Steps:**
1. Open the **Stock Input** page and choose an input method:
   - **Upload PDF** from your phone's files, or
   - **Scan with Camera** to photograph a physical invoice.
2. The first time you do this, the app asks for **camera** and/or **photo library** permission — tap **Allow**.
3. Wait while the app processes the PDF/photo and extracts the invoice data.
4. On the **review screen**, check each extracted line item: product name, quantity, buying price, etc.
5. Correct any mistakes by editing the fields directly if the extraction got something wrong.
6. Tap **Approve/Confirm** once everything looks correct.
7. The app saves the data to your stock database and shows a **"Successfully uploaded"** confirmation.
8. Review the **updated stock list** shown immediately after, to confirm the new quantities are correct.

---

## 6. Sales Page (POS System)

**Purpose:** Process an in-store sale.

**Steps:**
1. Open the **Sales** tab — a grid/list of products with prices is displayed.
2. Tap (or click, on web) a product to **add it** to the current order.
3. Adjust the **quantity** using +/- controls, or remove an item if added by mistake.
4. Watch the **running total** update live as you add/remove items.
5. Apply a **discount** if applicable (e.g. promotional pricing).
6. Review the **order summary** before checkout.
7. Tap **Confirm/Complete Sale** to process payment.
8. The transaction is recorded and the order screen resets for the next customer.

---

## 7. Supplier Restock Email

**Purpose:** Request more stock from a supplier without leaving the app.

**Steps:**
1. Open a product's **expanded card** on the Inventory page (see Section 2).
2. Tap the **email supplier / restock** icon or button.
3. A **popup or new page** opens with a pre-filled email template containing: product name, supplier name, suggested/requested quantity, current stock level, and an urgency indicator.
4. Edit the message text if you want to add notes or change the quantity.
5. Tap **Send**.
6. A **confirmation message** appears once the email is sent successfully.
7. (Optional) The sent request may be logged so you can track which restock emails have already been sent for that product.

---

## Visual Style

- Background: white
- Theme colors: `#4E6CD6` (blue), `#FFDF58` (yellow), `#50BF9A` (green), `#000000` (black)
