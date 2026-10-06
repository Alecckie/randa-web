# Rider Account API — Campaign History, Helmet Reports & Withdrawals

> Updated: 2026-07-21
> Backend: Laravel + Sanctum (`randa-web`)
> For use by: Mobile (Flutter) team
> Verified: end-to-end over real HTTP with live Sanctum tokens against a local copy of the app, 2026-07-21 (see Verified Test Runs below)

All requests require:
```
Content-Type: application/json      (JSON endpoints — omit for the multipart helmet-report upload)
Accept: application/json
Authorization: Bearer <token>
```

Base URL: `/api/v1`

This doc covers three previously-missing/broken pieces of the rider account surface. For shift/check-in/tracking, see [rider-shift-api.md](rider-shift-api.md); for assignment accept/reject, see [rider-assignment-api.md](rider-assignment-api.md).

---

## 1. Campaign History

**Net new — there was no mobile endpoint for this before today.** The web dashboard has always had a "My Campaigns" list; mobile did not.

### List — `GET /rider/campaigns`

Every campaign assignment this rider has ever had — current and past — each with a lightweight earnings summary. This is the list/summary screen.

Query params:

| Param | Required | Notes |
|-------|----------|-------|
| `status` | No | Filter to one assignment status: `pending`, `active`, `completed`, `cancelled`, `rejected`. Omit for everything. |
| `per_page` | No | Default 15. |

```json
{
  "success": true,
  "message": "Campaigns retrieved.",
  "data": {
    "current_page": 1,
    "data": [
      {
        "assignment_id": 16,
        "status": "active",
        "assigned_at": "2026-07-04T06:40:16.000000Z",
        "responded_at": null,
        "completed_at": null,
        "campaign": { "id": 2, "name": "TEST", "status": "active", "start_date": "2026-07-04", "end_date": "2026-07-08" },
        "helmet": { "id": 1, "helmet_code": "HLM-0001" },
        "days_worked": 4,
        "total_earning": 98.28
      }
    ],
    "total": 4, "per_page": 15, "current_page": 1, "last_page": 1
  }
}
```

> **`assignment_id` is not a campaign id.** A rider can have more than one assignment against the same campaign over time (e.g. rejected once, re-offered later with a different helmet — see [rider-assignment-api.md](rider-assignment-api.md)). Always use `assignment_id` to drill into detail, never `campaign.id`.

> **`days_worked`/`total_earning` here are lightweight aggregates**, not the day-by-day breakdown — computed the same way (from ended shifts' `daily_earning`) as everywhere else in this API, so they'll always agree with the detail view and with `GET /rider/earnings/monthly`. For the full daily breakdown of one campaign, call the detail endpoint below rather than trying to reconstruct it from the list.

### Detail — `GET /rider/campaigns/{assignment_id}`

Full day-by-day earnings breakdown for one specific campaign assignment — the "trip details" screen.

```json
{
  "success": true,
  "message": "Campaign details retrieved.",
  "data": {
    "assignment": {
      "assignment_id": 1,
      "status": "completed",
      "assigned_at": "2026-03-24T21:00:00.000000Z",
      "responded_at": null,
      "completed_at": "2026-07-04T06:19:02.000000Z"
    },
    "campaign": { "id": 1, "name": "Nairobi City Brand Blitz", "status": "completed", "start_date": "2026-03-25", "end_date": "2026-05-24" },
    "helmet": { "id": 1, "helmet_code": "HLM-0001" },
    "summary": {
      "days_worked": 4,
      "total_hours_worked": 12.62,
      "total_payable_hours": 12.62,
      "total_earning": 98.28,
      "total_settled": 0,
      "total_owed": 98.28,
      "days": [
        {
          "check_in_id": 37,
          "date": "2026-07-04",
          "check_in_time": "09:00 AM",
          "check_out_time": "04:13 PM",
          "worked_hours": 6.17,
          "payable_hours": 6.17,
          "stationary_hours": 0,
          "hourly_rate": 10,
          "daily_earning": 61.67,
          "max_possible_earning": 70,
          "qualified": true,
          "settled": false,
          "settled_at": null
        }
      ]
    }
  }
}
```

`summary` is exactly the shape `GET /rider/earnings/monthly` and the web dashboard both already use (`RiderPayoutService`) — same field names, same rounding, same "settled" meaning (see [Pay Rules](rider-shift-api.md#pay-rules)). Requesting an assignment that isn't yours returns 403; a nonexistent id returns 404 with Laravel's default not-found shape (not the `{success,message}` envelope — see [rider-assignment-api.md](rider-assignment-api.md#error-handling) for that distinction).

---

## 2. Helmet Reports

**Was completely broken until today** — every request to any helmet-report endpoint failed at the routing layer (`Class "App\Http\Controllers\Api\HelmetReportController" does not exist`, logged repeatedly from 2026-04-13 through this morning) because the controller and its form request lived in the wrong namespace. Fixed and verified below. One endpoint (`GET /rider/helmet-reports`, list) was also missing entirely and has been added.

> **Resolution isn't wired up on the admin side yet.** A rider can submit a report and see it, but no admin page or route currently surfaces reports for review — every report you submit will sit at `report_status: "open"` indefinitely for now. Don't build UI that promises "an admin will resolve this" as a real-time expectation yet.

### Submit — `POST /rider/helmet-reports`

Multipart form (image upload), **not** JSON.

| Field | Required | Rules |
|-------|----------|-------|
| `helmet_image` | Yes | image, jpeg/jpg/png, ≤10MB |
| `status_description` | Yes | string, 10–2000 chars |
| `priority_level` | Yes | `low` \| `medium` \| `high` |

The helmet is resolved server-side from your **current active campaign assignment** — you don't send a helmet id.

```json
{
  "success": true,
  "message": "Helmet report submitted successfully.",
  "data": {
    "report": {
      "id": 1,
      "helmet_image_url": "/storage/riders/helmet-reports/1/2026/07/....jpg",
      "status_description": "The helmet strap is torn and needs replacement urgently",
      "priority_level": "high",
      "report_status": "open",
      "resolution_notes": null,
      "resolved_at": null,
      "created_at": "2026-07-21T12:12:32+03:00",
      "rider": { "id": 1, "name": "James Mwangi" },
      "helmet": { "id": 1, "helmet_code": "HLM-0001" }
    }
  }
}
```

If you have no active campaign assignment (no helmet to report on): `422 { "success": false, "message": "No helmet is currently assigned to you." }` — this used to come back as a generic `500`; fixed today to the correct 4xx.

### List — `GET /rider/helmet-reports`

Your own submitted reports, paginated, same `report` shape as above (`data.data[]`) — every list/detail/submit endpoint now returns the identical shape, so you can reuse one model class client-side.

### Detail — `GET /rider/helmet-reports/{id}`

Same shape, single report. 403 if it isn't yours.

---

## 3. Withdrawals

**Net new feature, built today** — there was previously no way for a rider to request a cash-out; only an admin-initiated bookkeeping action existed (and it wasn't reachable from mobile).

```
Rider taps Withdraw ──▶ PENDING ──admin pays rider externally, marks settled──▶ SETTLED (wallet_balance decreases, rider notified)
                            │
                            └──admin declines──▶ REJECTED (no money moves, rider notified with reason)
```

- **No amount field** — a withdrawal request is always for your *entire* current unsettled balance (`available_balance` below), not a partial amount.
- **Only one pending request at a time.** Requesting again while one is pending returns a 422.
- **This does not move money by itself.** Admin still pays the rider manually (e.g. M-Pesa) outside the system, exactly like the previous bookkeeping-only flow — "settled" means "I already paid them and I'm recording it," not "trigger a payout."
- **`amount_settled` can differ slightly from `amount_requested`** if more shifts ended and qualified for pay while the request was still pending — settling always pays out the full *current* balance, not a frozen snapshot from request time. Both figures are kept so the discrepancy (if any) is visible, not hidden.

### Wallet + history — `GET /rider/withdrawals`

One call drives the whole wallet screen: balance, whether the Withdraw button should be disabled, and history below it.

```json
{
  "success": true,
  "message": "Withdrawals retrieved.",
  "data": {
    "available_balance": 70,
    "has_pending_request": false,
    "withdrawals": {
      "data": [
        {
          "id": 1,
          "amount_requested": 70,
          "amount_settled": 70,
          "status": "settled",
          "rejection_reason": null,
          "requested_at": "2026-07-21T12:31:21+03:00",
          "reviewed_at": "2026-07-21T12:31:57+03:00"
        }
      ],
      "total": 1, "per_page": 15, "current_page": 1, "last_page": 1
    }
  }
}
```

Disable the Withdraw button when `available_balance <= 0` OR `has_pending_request` is `true`.

### Request — `POST /rider/withdrawals`

No request body.

```json
{
  "success": true,
  "message": "Withdrawal request submitted.",
  "data": { "withdrawal": { "id": 1, "amount_requested": 70, "amount_settled": null, "status": "pending", "rejection_reason": null, "requested_at": "...", "reviewed_at": null } }
}
```

| Case | Response |
|------|----------|
| Already have a pending request | `422 { "success": false, "message": "You already have a withdrawal request pending review." }` |
| Nothing owed (`available_balance` is 0) | `422 { "success": false, "message": "You have nothing available to withdraw." }` |

### Detail — `GET /rider/withdrawals/{id}`

Same shape as one item in the list above. 403 if it isn't yours.

### What the rider sees on settle/reject

Both are in-app notifications only (`GET /notifications`, same as every other event in this app — see [rider-registration-api.md](rider-registration-api.md)):

- Settled: *"Your withdrawal of KSh 70.00 has been paid out and marked settled."* — `type: success`
- Rejected: *"Your withdrawal request was declined. Reason: ..."* (reason omitted if the admin didn't give one) — `type: error`

### Admin side (for context — not a mobile concern)

A new admin web page (`/admin/withdrawals`, session-auth) lists all requests with a reconciliation summary (pending count/amount, settled-this-month count/amount) and lets admin mark a request settled or reject it with a reason. Wired into the admin nav with a pending-count badge, same convention as the existing pending-riders/advertisers/payments badges.

---

## Verified Test Runs

**2026-07-21 — Campaign History, real HTTP with a live Sanctum token (PASS):**
1. `GET /rider/campaigns` → 200, returned all 4 of a real rider's assignments across 2 campaigns with correct `days_worked`/`total_earning` per row.
2. `GET /rider/campaigns?status=completed` → 200, correctly filtered to 2 of the 4.
3. `GET /rider/campaigns/1` (own assignment) → 200, full daily breakdown matching the list's summary figures.
4. `GET /rider/campaigns/2` (a different rider's assignment) → 403, cross-rider access correctly blocked.

**2026-07-21 — Helmet Reports, real HTTP, multipart upload (PASS):**
1. Confirmed the controller/request classes now resolve (`class_exists()` — previously threw `ReflectionException` in production logs for 3+ months).
2. `POST /rider/helmet-reports` with a real JPEG, rider with an active assignment → 201, correct `report` shape including `helmet_image_url`.
3. `GET /rider/helmet-reports` → 200, same shape as submit response (fixed an inconsistency where list previously would have returned raw un-formatted model attributes).
4. `GET /rider/helmet-reports/{id}` → 200, matches.
5. `POST /rider/helmet-reports`, rider with **no** active assignment → `422 "No helmet is currently assigned to you."` (previously would have been a `500`).
6. Test report + uploaded image deleted afterward; no lasting changes.

**2026-07-21 — Withdrawals, mixed real HTTP + direct controller calls (PASS):**
1. `GET /rider/withdrawals` before requesting → `available_balance: 70`, `has_pending_request: false`, empty history.
2. `POST /rider/withdrawals` → 201, `status: pending`, `amount_requested: 70`.
3. `POST /rider/withdrawals` again (still pending) → 422, correctly blocked.
4. Admin `settle()` on the request → wallet_balance went from 70.00 to 0.00, request `status: settled`, `amount_settled: 70.00`, rider received the correct in-app notification.
5. `GET /rider/withdrawals` after settling → reflects `settled` status and `amount_settled` correctly, `available_balance: 0`.
6. A second rider's request rejected via admin `reject()` with a reason → wallet_balance **unchanged**, `status: rejected`, correct notification with the reason included.
7. Admin `/admin/withdrawals` index page rendered successfully (Inertia response, no errors).
8. All test withdrawal requests, notifications, and wallet-balance changes reverted afterward; no lasting changes to real rider data.
