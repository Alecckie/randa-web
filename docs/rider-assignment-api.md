# Rider Assignment Acceptance API

> Updated: 2026-07-21
> Backend: Laravel + Sanctum (`randa-web`)
> For use by: Mobile (Flutter) team
> Verified: end-to-end over real HTTP with a live Sanctum token against a local copy of the app, 2026-07-21 (see Verified Test Runs below)

All requests require:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

Base URL: `/api/v1`

For shift/check-in/tracking, see [rider-shift-api.md](rider-shift-api.md). For campaign history, helmet reports, and withdrawals, see [rider-account-api.md](rider-account-api.md).

---

## What's New

Admin-assigned campaigns are no longer auto-onboarded. When an admin assigns a rider to a campaign + helmet, the assignment is created as **`pending`** — the rider is not yet checked-in-able, does not show up as their "current campaign," and nothing counts against them until they respond.

```
Admin assigns rider ──▶ PENDING ──rider accepts──▶ ACTIVE (onboarded, can check in)
                            │
                            └──rider rejects──▶ REJECTED (helmet freed for reassignment)
```

- **The helmet is reserved the moment the assignment is created**, before the rider responds — no other rider can be offered the same helmet while one is pending.
- **Nothing about check-in, tracking, or the earnings summary changes.** Those endpoints already only recognize `status = 'active'` assignments (see [rider-shift-api.md](rider-shift-api.md)), so a rider with only a pending assignment correctly sees "no active campaign" until they accept — you don't need new client logic there, just don't let the rider attempt to check in against a pending assignment (there's no helmet QR to scan yet in practice, but the API would reject it with the existing `No active campaign assignment found for this helmet and rider.` error anyway).
- Rejecting is **terminal** — a rejected assignment can't be re-accepted. If the admin wants to try again, they create a new assignment (possibly a different helmet, since the old one may have been picked up by someone else in the meantime).

---

## Show Pending Assignments

```
GET /rider/assignments/pending
```

Call this on dashboard/home load, and whenever a "New Campaign Assignment" notification arrives (see [Notifications](#notifications) below) so the UI can show an accept/reject card without waiting for a manual refresh.

### Response · 200

```json
{
  "success": true,
  "message": "Pending assignments retrieved.",
  "data": {
    "assignments": [
      {
        "id": 24,
        "campaign_id": 2,
        "campaign_name": "TEST",
        "helmet_code": "HLM-0005",
        "status": "pending",
        "assigned_at": "2026-07-21T07:20:48.000000Z",
        "responded_at": null,
        "rejection_reason": null
      }
    ]
  }
}
```

Empty `assignments: []` is normal and common — most riders will have none most of the time.

---

## Accept Assignment

```
PATCH /rider/assignments/{assignment}/accept
```

No request body. `{assignment}` is the assignment `id` from the pending list above.

### Response · 200

```json
{
  "success": true,
  "message": "Assignment accepted. You are now onboarded to the campaign.",
  "data": {
    "assignment": {
      "id": 24,
      "campaign_id": 2,
      "campaign_name": "TEST",
      "helmet_code": "HLM-0005",
      "status": "active",
      "assigned_at": "2026-07-21T07:20:48.000000Z",
      "responded_at": "2026-07-21T07:20:57.000000Z",
      "rejection_reason": null
    }
  }
}
```

After this succeeds, the assignment is `active` — it will now appear from `GET /rider/assignment/current` and drive the campaign summary / check-in flow exactly like any other active assignment.

---

## Reject Assignment

```
PATCH /rider/assignments/{assignment}/reject
```

### Request Body

| Field | Required | Rules |
|-------|----------|-------|
| `reason` | No | string, ≤500 chars — shown to the admin, not required |

### Response · 200

```json
{
  "success": true,
  "message": "Assignment rejected.",
  "data": {
    "assignment": {
      "id": 24,
      "status": "rejected",
      "rejection_reason": "Route is too far from my location",
      "responded_at": "2026-07-21T07:22:10.000000Z",
      "...": "..."
    }
  }
}
```

The helmet is freed back to the available pool immediately — the admin can reassign it to someone else right away.

---

## Error Handling

**Domain errors** (already responded, assignment not pending) come back in the same `{ success, message }` shape as every other endpoint in this API, HTTP 422:

```json
{ "success": false, "message": "Only pending assignments can be accepted." }
```

| Endpoint | Message |
|----------|---------|
| accept | `Only pending assignments can be accepted.` (already active/rejected/completed/cancelled) |
| reject | `Only pending assignments can be rejected.` |

**Three response shapes are *not* the standard `{ success, message }` envelope** — handle these separately rather than assuming every error has a `success` key:

| Case | HTTP | Body |
|------|------|------|
| Assignment belongs to a different rider | 403 | `{ "message": "You are not authorized to access this assignment." }` (plus a debug stack trace while `APP_DEBUG=true` on this environment — production will just have `message`) |
| Assignment id doesn't exist | 404 | `{ "message": "No query results for model [App\\Models\\CampaignAssignment] {id}" }` |
| `reason` over 500 chars | 422 | `{ "message": "...", "errors": { "reason": ["The reason field must not be greater than 500 characters."] } }` |
| No/expired token | 401 | `{ "message": "Unauthenticated." }` |

In practice: only ever call accept/reject with an `id` you got from `GET /rider/assignments/pending` for the logged-in rider, and cap the reason field client-side at 500 characters — that avoids hitting the 403/404/422 cases in normal use, but handle them defensively anyway (e.g. a race where two devices on the same account both try to respond to the same assignment).

---

## Notifications

When an admin assigns a rider, a standard in-app notification is created (retrievable via the existing `GET /notifications` — see [rider-registration-api.md](rider-registration-api.md) for that endpoint's shape):

```json
{
  "title": "New Campaign Assignment — Action Required",
  "body": "You've been offered \"TEST\" with helmet HLM-0005. Please accept or reject this assignment.",
  "type": "info",
  "link": "/rider/campaigns"
}
```

`link` is a **web path** (it's what the Inertia web dashboard navigates to), not a mobile deep link — map it to your equivalent "My Campaigns" / pending-assignments screen client-side rather than trying to open it as a URL. This matches how every other notification in the app works (see rider-registration-api.md), so if you've already built generic notification-tap handling that maps web paths to native screens, no new mapping logic is needed beyond adding `/rider/campaigns` → your campaigns screen if it isn't already there.

There is currently no push notification for this event, in-app only — same as the rest of this API. Poll `GET /notifications` or `GET /rider/assignments/pending` on foreground/dashboard load.

---

## What Changed (2026-07-21)

- **New feature: assignments require rider acceptance.** Previously `assignRider` created assignments as `active` immediately — riders were onboarded the instant an admin assigned them, with no way to decline. Assignments now start `pending`; onboarding only happens once the rider calls `accept`. Existing check-in/tracking/earnings endpoints needed no changes since they already only recognize `status = 'active'`.
- New endpoints: `GET /rider/assignments/pending`, `PATCH /rider/assignments/{id}/accept`, `PATCH /rider/assignments/{id}/reject`.

---

## Verified Test Runs

**2026-07-21 — full HTTP round trip against a live Sanctum token (PASS):**

1. Admin-side `assignRider()` created a real `pending` assignment (id 24) and reserved the helmet (`helmets.status → assigned`).
2. `GET /rider/assignments/pending` with the rider's real bearer token → 200, returned the one pending assignment with correct campaign/helmet fields.
3. `PATCH /rider/assignments/24/accept` → 200, `status: active`, `responded_at` stamped.
4. `PATCH /rider/assignments/24/accept` again (already active) → 422, `Only pending assignments can be accepted.`
5. `PATCH /rider/assignments/16/reject` using assignment 16, which belongs to a *different* rider than the token's owner → 403, `You are not authorized to access this assignment.` — cross-rider access correctly blocked.
6. `PATCH /rider/assignments/24/reject` with a 600-character `reason` → 422 Laravel validation error, correctly distinct shape from the domain-error envelope (see [Error Handling](#error-handling)).
7. `GET /rider/assignments/pending` with no `Authorization` header → 401 `Unauthenticated.`

Also verified at the service layer (rolled-back DB transaction, see `CampaignAssignmentService`): offering the same helmet to a second rider while the first assignment is still pending is correctly blocked (`Helmet is already assigned to another campaign.`), and rejecting frees the helmet back to `available` immediately.

Test data created for this run (assignment id 24, its Sanctum token) was deleted afterward; no lasting changes to rider/campaign/helmet data.
